# Twitch Mention Helper
Userscript that helps keeping track of chat mentions
<BR/>
Enjoy.
<BR/><BR/>
Version <strong>0.1</strong>

<A HREF="https://github.com/TomONeill/twitch-mention-helper/raw/master/latest.user.js">INSTALL</A>

# Changelog
<A HREF="https://raw.githubusercontent.com/TomONeill/twitch-mention-helper/master/changelog.txt">View changelog</A>

# Donate
If you like my work so much you feel like doing something nice for me, a complete stranger of the internet, you can.<BR />
<A HREF="https://www.paypal.me/TomONeill">Donate here</A>.

# Development
If you want to help with the development, you can. To setup the dev in combination with Tampermonkey/other, do the following:
1. Open the repository in your favourite IDE.
2. Open CMD, PowerShell or the terminal (VS Code tip: use CTRL + \`).<br/>
2.5: If not already, `cd` to this repository.
3. Type: `tsc --watch` to run the TypeScript compiler. The `tsconfig.json` file will determine the location of the output.
4. Add a userscript with the following:
```
	// ==UserScript==
	// @name         Twitch Mention Helper
	// @namespace    https://www.twitch.tv/
	// @version      0.1-dev
	// @description  Saves timestamp of mentions and notifies the user with sound
	// @updateURL 	 https://github.com/TomONeill/twitch-mention-helper/raw/master/twitch-mention-helper-latest.user.js
	// @match        https://www.twitch.tv/*
	// @run-at       document-end
	// @grant        unsafeWindow
	// @domain       https://www.twitch.tv
	// @require      file://{YOUR_CLONE}\twitch-mention-helper-latest.user.js
	// @author       Tom
	// @copyright    2020, Tom
	// ==/UserScript==
	/* jshint -W097 */
	/* console */
	'use strict';
```
5. Make sure you have ticked the box `Allow access to file URLs` for the Tampermonkey/other extension.

Any change will compile (some would say transpile) and a browser refresh will do the rest.