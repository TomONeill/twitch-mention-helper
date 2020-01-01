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
// @author       Tom
// @copyright    2020, Tom
// ==/UserScript==
/* jshint -W097 */
/* console */
'use strict';

/*
TODO:
- Support SPA:
--- Detach from chat when state changes // https://stackoverflow.com/a/52809105/1760313
--- (Re)attach to chat when state changes
- Save the chat msgs somewhere outside of the console
- (icm with above) button that lights up after receiving new mentions
- (icm with above) view mentions somewhere inline
Later:
- Pick from a list of notification sounds
- Upload your own sound
- Custom list of mentions that you want to be notified of
- ^> Custom notification sound
*/

const DEBUG = true;

const executeOnInitialised = setInterval(() => {
	const hasInitialised = document.querySelector("#root").getAttribute("data-a-page-loaded") != null;
	if (hasInitialised) {
		if (DEBUG) { console.log("Page initialised. Executing script..."); }
		clearInterval(executeOnInitialised);
		execute();
	} else {
		if (DEBUG) { console.log("Page not ready yet."); }
	}
}, 250);

function execute() {
	if (!isLoggedIn()) {
		if (DEBUG) { console.warn("User not logged in. Please login and refresh the page."); }
		return;
	}
	const loggedInUsername = getLoggedInUsername();
	const chatObserver = attachToChat();

	function attachToChat() {
		if (DEBUG) { console.info("Attaching to chat..."); }

		const chatList = findChatList();
		if (chatList == null) {
			if (DEBUG) { console.error("Could not find chat."); }
			return;
		}

		const chatObserver = new MutationObserver(chatListChanged);
		const chatObserverConfig = { attributes: false, childList: true, subtree: false };
		chatObserver.observe(chatList, chatObserverConfig);

		if (DEBUG) { console.info("Attached to chat."); }

		return chatObserver;
	}

	function isLoggedIn() {
		return document.querySelector("body.logged-in") != null;
	}

	function getLoggedInUsername() {
		 // Click twice on the user menu toggle to render the dropdown in the DOM (but not in view) which contains the username.
		const userMenu = document.querySelector(`button[data-a-target="user-menu-toggle"]`);
		userMenu.click();
		userMenu.click();

		const loggedInUsername = document.querySelector("h6[data-a-target=\"user-display-name\"]").innerText;
		if (DEBUG) { console.log(`The currently logged user is ${loggedInUsername}`); }
		return loggedInUsername;
	}

	function findChatList() {
		const chatListContainers = document.getElementsByClassName("chat-list__list-container");
		if (chatListContainers.length > 0) {
			return chatListContainers[0];
		}
		return null;
	}

	function chatListChanged(mutationsList, observer) {
		mutationsList.map(processMutation);
	}

	function processMutation(mutation) {
		const chatMessages = mutation.addedNodes;
		[...chatMessages].map(processChatMessage);
	}

	function processChatMessage(chatMessage) {
		if (chatMessage.className !== "chat-line__message") {
			return;
		}

		const chatMessageElements = [...chatMessage.children];
		const chatMessageAuthor = chatMessageElements.find(x => x.className === "chat-line__username").innerText;
		const chatMessageMentions = chatMessageElements.filter(x => [...x.classList.values()].includes("mention-fragment")).map(y => y.innerText);
		const chatMessageContentElement = chatMessageElements.find(x => x.className === "text-fragment");
		const chatMessageContent = chatMessageContentElement != null ? chatMessageContentElement.innerText : "";

		if (chatMessageMentions.includes(loggedInUsername) || chatMessageMentions.includes(`@${loggedInUsername}`)) {
			const currentLocalDateTime = new Date().toLocaleString();
			console.log(`(${currentLocalDateTime}) ${chatMessageAuthor}:${chatMessageContent}`);
			playNotificationSound();
		}
	}

	function playNotificationSound() {
		const base64Audio = "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";
		const audio = new Audio("data:audio/wav;base64," + base64Audio);
		audio.play();
	}
}

if (DEBUG) { console.log("Script loaded."); }