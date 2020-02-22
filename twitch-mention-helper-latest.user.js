// ==UserScript==
// @name         Twitch Mention Helper
// @namespace    https://www.twitch.tv/
// @version      0.1
// @description  Saves timestamp of mentions and notifies the user with sound
// @updateURL 	 https://github.com/TomONeill/twitch-mention-helper/raw/master/twitch-mention-helper-latest.user.js
// @match        https://www.twitch.tv/*
// @run-at       document-end
// @grant        unsafeWindow
// @domain       https://www.twitch.tv
// @author       TomONeill
// @copyright    2020, TomONeill
// ==/UserScript==
/* jshint -W097 */
/* console */
'use strict';

/*
TODO:
- Indicator on the mention icon after receiving new mentions (only when mention is out of view)
- Make mention settings popup functional
- Fix state change properly, including re-adding html
Later:
- Include source (channel name) of mention
- Support a set of notification sounds
- Custom notification sound (per username)
- Keep mention history option? (localStorage)
- Heads up notification
*/

const _DEBUG = true;
const _usernamesToTrack = [];
let _chatObserver = null;

const executeOnPageInitialisation = setInterval(() => {
	const hasInitialised = document.querySelector("#root").getAttribute("data-a-page-loaded") != null;
	if (hasInitialised) {
		if (_DEBUG) { console.info("Page initialised."); }
		clearInterval(executeOnPageInitialisation);
		initialise();
	} else {
		if (_DEBUG) { console.info("Page not ready yet."); }
	}
}, 250);

function initialise() {
	setupStateChangeEvent();
	initialiseUsernamesToTrack();
	initialiseStateChangeEvent();
	addHtml();
	setTimeout(() => tryAttachToChat());
}

// Thanks to https://stackoverflow.com/a/52809105/1760313
function setupStateChangeEvent() {
	history.pushState = (f => function pushState() {
		const ret = f.apply(this, arguments);
		window.dispatchEvent(new Event("pushstate"));
		window.dispatchEvent(new Event("statechange"));
		return ret;
	})(history.pushState);

	history.replaceState = (f => function replaceState() {
		const ret = f.apply(this, arguments);
		window.dispatchEvent(new Event("replacestate"));
		window.dispatchEvent(new Event("statechange"));
		return ret;
	})(history.replaceState);

	window.addEventListener("popstate", () => {
		window.dispatchEvent(new Event("statechange"))
	});
}

function initialiseUsernamesToTrack() {
	const ownUsername = getOwnUsername();
	if (ownUsername != null) {
		_usernamesToTrack.push(ownUsername);
	}
}

function getOwnUsername() {
	if (!isLoggedIn()) {
		return null;
	}

	// Click twice on the user menu toggle to render the dropdown in the DOM (but not in view) which contains the username.
	const userMenu = document.querySelector(`button[data-a-target="user-menu-toggle"]`);
	userMenu.click();
	userMenu.click();

	const usernameElement = document.querySelector("h6[data-a-target=\"user-display-name\"]");
	if (usernameElement == null) {
		console.error("Could not get own username. Your username will NOT be tracked this session.");
		return null;
	}
	const loggedInUsername = usernameElement.innerText;
	if (_DEBUG) { console.info(`The current user is ${loggedInUsername}`); }
	return loggedInUsername;
}

function isLoggedIn() {
	const isLoggedIn = document.querySelector("body.logged-in") != null;
	if (_DEBUG) { console.info("Is logged in:", isLoggedIn); }
	return isLoggedIn;
}

function initialiseStateChangeEvent() {
	window.addEventListener("statechange", () => {
		if (_DEBUG) { console.info("State change detected."); }

		if (isAttachedToChat()) {
			detachFromChat();
		}
		setTimeout(() => tryAttachToChat());
	});
}

function isAttachedToChat() {
	const isAttachedToChat = _chatObserver != null;
	if (_DEBUG) { console.info("Attached to chat:", isAttachedToChat); }
	return isAttachedToChat;
}

function detachFromChat() {
	if (_DEBUG) { console.info("Detaching from chat..."); }

	_chatObserver.disconnect();
	_chatObserver = null;

	if (_DEBUG) { console.info("Detached from chat."); }
}

function tryAttachToChat() {
	const chatList = findChatList();
	if (chatList == null) {
		if (_DEBUG) { console.warn("Could not find chat."); }
		return false;
	}
	attachToChat(chatList);
	return true;
}

function findChatList() {
	const chatListContainers = document.getElementsByClassName("chat-list__list-container");
	if (chatListContainers.length > 0) {
		return chatListContainers[0];
	}
	return null;
}

function attachToChat(chatList) {
	if (_DEBUG) { console.info("Attaching to chat..."); }

	_chatObserver = new MutationObserver(chatListChanged);
	const chatObserverConfig = { attributes: false, childList: true, subtree: false };
	_chatObserver.observe(chatList, chatObserverConfig);

	if (_DEBUG) { console.info("Attached to chat."); }
}

function chatListChanged(mutationsList, observer) {
	mutationsList.map(processChatListMutation);
}

function processChatListMutation(mutation) {
	const chatMessages = mutation.addedNodes;
	[...chatMessages].map(processChatMessage);
}

function processChatMessage(chatMutation) {
	if (chatMutation.className !== "chat-line__message") {
		return;
	}

	const chatMessage = new ChatMessage(chatMutation);

	_usernamesToTrack.forEach(usernameToTrack => {
		if (chatMessage.mentions.some(mention => mention.toUpperCase() === usernameToTrack.toUpperCase())) {
			console.log(`(${new Date(chatMessage.createdOn).toLocaleString()}) ${chatMessage.author}:${chatMessage.textContent}`);
			saveChatMessage(chatMessage);
			playNotificationSound();
		}
	});
}

class ChatMessage {
	_createdOn;
	_author;
	_mentions;
	_textContent;
	_htmlContent;

	constructor(node) {
		this._createdOn = new Date();
		this.node = node;
	}

	get createdOn() {
		return this._createdOn;
	}

	get author() {
		if (this._author != null) {
			return this._author;
		}
		this._author = [...this.node.children].find(x => x.className === "chat-line__username").innerText;
		return this._author;
	}

	get mentions() {
		if (this._mentions != null) {
			return this._mentions;
		}
		this._mentions = [...this.node.children]
			.filter(x => [...x.classList.values()].includes("mention-fragment"))
			.map(y => y.innerText.replace(/^@/, ''));
		return this._mentions;
	}

	get textContent() {
		if (this._textContent != null) {
			return this._textContent;
		}
		const messagePart = [...this.node.children].slice(3, this.node.childElementCount);
		this._textContent = messagePart.map(x => this.getElementText(x)).join("");
		return this._textContent;
	}

	get htmlContent() {
		if (this._htmlContent != null) {
			return this._htmlContent;
		}
		const htmlContent = createNode(this.node.outerHTML);
		htmlContent.classList.add("tw-pd-05");
		htmlContent.querySelector("span.chat-line__username").style.cursor = "default";
		const emotes = htmlContent.getElementsByClassName("chat-line__message--emote-button");
		if (emotes.length > 0) {
			[...emotes].forEach((emote) => {
				emote.style.cursor = "default";
				emote.querySelector("span.chat-image__placeholder").classList.add("tw-hide");
				emote.querySelector("img.chat-line__message--emote").classList.remove("tw-hide");
			});
		}
		this._htmlContent = htmlContent.outerHTML;
		return this._htmlContent;
	}

	toJSON() {
		return {
			createdOn: this.createdOn,
			author: this.author,
			mentions: this.mentions,
			textContent: this.textContent,
			htmlContent: this.htmlContent
		}
	}
	
	// Thanks to https://www.456bereastreet.com/archive/201105/get_element_text_including_alt_text_for_images_with_javascript/
	getElementText(element) {
		if (element.nodeType === Node.TEXT_NODE || element.nodeType === Node.CDATA_SECTION_NODE) {
			return element.nodeValue;
		}

		if (element.nodeType === Node.ELEMENT_NODE) {
			if (["img", "area"].includes(element.tagName.toLowerCase()) || this.isInputWithTypeImage(element)) {
				return element.getAttribute("alt") || "";
			} else if (!element.tagName.match(/^(script|style)$/i)) {
				let children = element.childNodes;
				let text = '';
				for (let i = 0, arrayLength = children.length; i < arrayLength; i++) {
					text += this.getElementText(children[i]);
				}
				return text;
			}
		}
		return "";
	}

	isInputWithTypeImage(element) {
		return element.tagName.toLowerCase() === "input"
			&& element.getAttribute("type")
			&& (element.getAttribute("type").toLowerCase() === "image");
	}
}

function saveChatMessage(chatMessage) {
	let existingMessages = JSON.parse(sessionStorage.getItem("twitch-mention-helper.mentions"));
	if (existingMessages == null) {
		existingMessages = [];
	}
	existingMessages.push(chatMessage);
	sessionStorage.setItem("twitch-mention-helper.mentions", JSON.stringify(existingMessages));
}

function playNotificationSound() {
	if (_DEBUG) { console.info("Playing notification sound."); }

	const base64Audio = "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";
	const audio = new Audio("data:audio/wav;base64," + base64Audio);
	audio.play();
}

function addHtml() {
	addMentionIcon();
}

function addMentionIcon() {
	addMentionIconEvents(ICON_AT);

	const chatInputButtonsContainer = document.getElementsByClassName("chat-input__buttons-container")[0];
	const chatInputButtons = chatInputButtonsContainer.children[1];
	const chatSettingsButton = chatInputButtons.children[1];
	chatInputButtons.insertBefore(ICON_AT, chatSettingsButton);
}

function addMentionIconEvents(mentionIconNode) {
	const mentionIconButtonNode = mentionIconNode.querySelector("button[data-a-target=chat-settings]");
	const chatSettingsPopupCloseButtonNode = POPUP_CHAT_SETTINGS.querySelector("button[data-test-selector=chat-settings-close-button-selector]");
	
	const removeChatSettingsPopupHandler = (event) => {
		if (!POPUP_CHAT_SETTINGS.contains(event.target)
		|| mentionIconButtonNode.contains(event.target)
		|| chatSettingsPopupCloseButtonNode.contains(event.target)) {
			POPUP_CHAT_SETTINGS.remove();
			removeEventListener("click", removeChatSettingsPopupHandler);
			mentionIconButtonNode.addEventListener("click", insertChatSettingsPopupHandler);
		}
	};

	const insertChatSettingsPopupHandler = (event) => {
		event.stopPropagation();
		const mentionIcon = mentionIconNode.children[0].children[0];
		mentionIcon.after(POPUP_CHAT_SETTINGS);
		addMentionsToChatSettingsPopup();
		addEventListener("click", removeChatSettingsPopupHandler);
		mentionIconButtonNode.removeEventListener("click", insertChatSettingsPopupHandler);
	};

	mentionIconButtonNode.addEventListener("click", insertChatSettingsPopupHandler);
}

function addMentionsToChatSettingsPopup() {
	const chatMentions = POPUP_CHAT_SETTINGS.querySelector(".chat__messages");
	while (chatMentions.firstChild) {
		chatMentions.removeChild(chatMentions.firstChild);
	}

	const chatMessages = getChatMessages();
	if (chatMessages.length === 0) {
		chatMentions.prepend(PLACEHOLDER_MENTIONS_NONE);
		return;
	}

	for (let i = chatMessages.length - 1; i >= 0; i--) {
		const chatMessage = chatMessages[i];
		chatMentions.prepend(createNode(chatMessage.htmlContent));
	}
}

function getChatMessages() {
	let chatMessages = JSON.parse(sessionStorage.getItem("twitch-mention-helper.mentions"));
	if (chatMessages == null) {
		chatMessages = [];
	}
	return chatMessages;
}

const ICON_AT = createNode(`<div class="tw-relative"><div><div class="tw-inline-flex tw-relative tw-tooltip-wrapper"><div class="tw-z-default"><button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-core-button tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative" data-a-target="chat-settings" aria-label="Mentions"><span class="tw-button-icon__icon"><div style="width: 2rem; height: 2rem;"><div class="tw-align-items-center tw-full-width tw-icon tw-icon--fill tw-inline-flex"><div class="tw-aspect tw-aspect--align-top"><div class="tw-aspect__spacer" style="padding-bottom: 100%;"></div><svg class="tw-icon__svg" width="100%" height="100%" version="1.1" viewBox="-50 -50 625 625" x="0px" y="0px"><path d="M504 232C504 95.751 394.053 8 256 8 118.94 8 8 118.919 8 256c0 137.059 110.919 248 248 248 52.926 0 104.681-17.079 147.096-48.321 5.501-4.052 6.423-11.924 2.095-17.211l-15.224-18.597c-4.055-4.954-11.249-5.803-16.428-2.041C339.547 442.517 298.238 456 256 456c-110.28 0-200-89.72-200-200S145.72 56 256 56c109.469 0 200 65.02 200 176 0 63.106-42.478 98.29-83.02 98.29-19.505 0-20.133-12.62-16.366-31.463l28.621-148.557c1.426-7.402-4.245-14.27-11.783-14.27h-39.175a12.005 12.005 0 0 0-11.784 9.735c-1.102 5.723-1.661 8.336-2.28 13.993-11.923-19.548-35.878-31.068-65.202-31.068C183.412 128.66 120 191.149 120 281.53c0 61.159 32.877 102.11 93.18 102.11 29.803 0 61.344-16.833 79.749-42.239 4.145 30.846 28.497 38.01 59.372 38.01C451.467 379.41 504 315.786 504 232zm-273.9 97.35c-28.472 0-45.47-19.458-45.47-52.05 0-57.514 39.56-93.41 74.61-93.41 30.12 0 45.471 21.532 45.471 51.58 0 46.864-33.177 93.88-74.611 93.88z" clip-rule="evenodd"></path></svg></div></div></div></span></button></div><div class="tw-tooltip tw-tooltip--align-center tw-tooltip--left" data-a-target="tw-tooltip-label" role="tooltip" id="773db2352383a2ec8baf5a20407cce78">Mentions</div></div></div></div>`);
const PLACEHOLDER_MENTIONS_NONE = createNode(`<div class="tw-c-background-base tw-c-text-base tw-flex-column tw-full-width tw-inline-flex"><div class="tw-align-self-center tw-pd-05"><span>You were not mentioned yet</span></div></div>`);
const POPUP_CHAT_SETTINGS = createNode(`<div class="tw-absolute tw-balloon tw-balloon--auto tw-balloon--right tw-balloon--up tw-block" data-a-target="chat-settings-balloon" role="dialog" style="margin-right: -8.3rem;"><div class="tw-border-radius-large tw-c-background-base tw-c-text-inherit tw-elevation-2"><div class="chat-settings__popover"><div class="chat-settings__header tw-align-items-center tw-c-background-base tw-flex tw-pd-x-1 tw-relative"><div class="chat-settings__back-icon-container tw-left-0 tw-mg-r-05"></div><div class="tw-align-center tw-align-items-center tw-flex tw-flex-grow-1 tw-justify-content-center"><p class="tw-c-text-alt tw-font-size-5 tw-semibold">Chat mentions</p></div><div class="tw-mg-l-05 tw-right-0"><button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-core-button tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative" data-test-selector="chat-settings-close-button-selector" aria-label="Close"><span class="tw-button-icon__icon"><div style="width: 2rem; height: 2rem;"><div class="tw-align-items-center tw-full-width tw-icon tw-icon--fill tw-inline-flex"><div class="tw-aspect tw-aspect--align-top"><div class="tw-aspect__spacer" style="padding-bottom: 100%;"></div><svg class="tw-icon__svg" width="100%" height="100%" version="1.1" viewBox="0 0 20 20" x="0px" y="0px"><g><path d="M8.5 10L4 5.5 5.5 4 10 8.5 14.5 4 16 5.5 11.5 10l4.5 4.5-1.5 1.5-4.5-4.5L5.5 16 4 14.5 8.5 10z"></path></g></svg></div></div></div></span></button></div></div><div class="chat-settings scrollable-area scrollable-area--suppress-scroll-x" data-test-selector="scrollable-area-wrapper" data-simplebar="init"><div class="simplebar-track vertical" style="visibility: hidden;"><div class="simplebar-scrollbar"></div></div><div class="simplebar-track horizontal" style="visibility: hidden;"><div class="simplebar-scrollbar"></div></div><div class="simplebar-scroll-content" style="padding-right: 14px; margin-bottom: -28px;"><div class="simplebar-content" style="padding-bottom: 14px; margin-right: -14px;"><div><div class="chat-settings__content tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-c-background-base tw-c-text-base tw-pd-1"><div class="chat__messages"></div><div class="tw-border-t tw-mg-t-1 tw-mg-x-05 tw-pd-b-1"></div><div class=""><div class="tw-mg-y-05 tw-pd-x-05"><p class="tw-c-text-alt-2 tw-font-size-6 tw-strong tw-upcase">My Preferences</p></div><div class="tw-pd-05"><div data-a-target="timestamp-checkbox" data-test-selector="timestamps-selector" class="tw-align-items-center tw-flex"><label class="tw-drop-down-menu-input-item__label tw-flex-grow-1" for="chat-settings-timestamp">Show Headsup Notifications</label><div class="tw-toggle" data-a-target="timestamp-checkbox" data-test-selector="timestamps-selector"><input type="checkbox" id="chat-settings-timestamp" label="Show Timestamp" class="tw-toggle__input" data-a-target="tw-toggle"><label for="chat-settings-timestamp" class="tw-toggle__button"><p class="tw-hide-accessible">Show Timestamp</p></label></div></div></div><div class="tw-pd-05"><div data-a-target="high-contrast-color-checkbox" data-test-selector="high-contrast-selector" class="tw-align-items-center tw-flex"><label class="tw-drop-down-menu-input-item__label tw-flex-grow-1" for="chat-settings-high-contrast">Play Notification Sounds</label><div class="tw-toggle" data-a-target="high-contrast-color-checkbox" data-test-selector="high-contrast-selector"><input type="checkbox" id="chat-settings-high-contrast" label="Readable Colors" class="tw-toggle__input" data-a-target="tw-toggle" checked=""><label for="chat-settings-high-contrast" class="tw-toggle__button"><p class="tw-hide-accessible">Readable Colors</p></label></div></div></div><div class="tw-full-width tw-relative"><button class="tw-block tw-border-radius-medium tw-full-width tw-interactable tw-interactable--alpha tw-interactable--hover-enabled tw-interactive" data-a-target="popout-chat-button" data-test-selector="popout-button"><div class="tw-align-items-center tw-flex tw-pd-05 tw-relative"><div class="tw-flex-grow-1">Add Notification Keywords</div></div></button></div></div></div></div></div></div></div></div></div></div>`);

function createNode(html) {
	var wrapper = document.createElement("div");
	wrapper.innerHTML = html;
	return wrapper.firstChild;
}

if (_DEBUG) { console.info("Script loaded."); }