/* ==========================================================
 * Accounts Manager (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013 Dmitry Sorin <info@staypositive.ru>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

// @requires StorageManager
var AccountsManager = (function () {
	var tokens = null;
	var activeUserId = null;

	/**
	 * VK OAuth webview
	 * @return {Promise}
	 */
	function initAuthWebview() { // new, add, update (uid)
		return new Promise(function (resolve, reject) {
			var oauthRedirectURI = "https://oauth.vk.com/blank.html";
			var webview = document.createElement("webview");
			webview.setAttribute("src", "https://oauth.vk.com/authorize?client_id=" + App.VK_ID + "&scope=" + App.VK_APP_SCOPE.join(",") + "&redirect_uri=" + oauthRedirectURI + "&display=page&response_type=token");
			webview.style.width = window.innerWidth + "px";
			webview.style.height = window.innerHeight + "px";

			webview.addEventListener("loadcommit", function (evt) {
				if (!evt.isTopLevel || evt.url.indexOf(oauthRedirectURI) !== 0) {
					return;
				}

				var tmp = document.createElement("a");
				tmp.setAttribute("href", evt.url);

				var token = tmp.hash.match(/access_token=([a-z0-9]+)/);
				var userId = tmp.hash.match(/user_id=([\d]+)/);
				var error = tmp.search.match(/error=([^&]+)/)
				var errorDescription = tmp.search.match(/error_description=([^&]+)/);

				if (error) {
					// FIXME: fill this with error/errorDescription
					statSend("App-Actions", "OAuth access cancelled");

					reject({
						error: error[1],
						description: errorDescription[1]
					});
				} else {
					// FIXME: update ns App-Actions probably?
					statSend("App-Actions", "OAuth access granted", userId[1]);

					resolve({
						token: token[1],
						uid: Number(userId[1])
					});
				}
			}, false);

			document.body.innerHTML = "";
			document.body.classList.add("authview");
			document.body.appendChild(webview);
		});
	}

	// разбор данных в StorageManager
	var parseTokens = function () {
		var index = 0;
		var activeProfile = StorageManager.get("profile_act");
		var lsTokens = StorageManager.get("token", {constructor: Array, strict: true, create: true});
		var currentUserId;

		tokens = {};
		activeUserId = 0;

		if (!lsTokens.length)
			return;

		if (typeof lsTokens[0] === "string")
			lsTokens = [lsTokens];

		lsTokens.forEach(function (tokenData, index) {
			var userIdInteger = parseInt(tokenData[1], 10);

			tokens[tokenData[1]] = {
				token: tokenData[0],
				fio: tokenData[2]
			};

			if (userIdInteger === parseInt(activeProfile, 10) || index === 0) {
				activeUserId = userIdInteger;
			}
		});
	};

	var writeData = function () {
		var tokensOutput = [];
		var userData, userId;

		for (var userId in tokens)
			tokensOutput.push([tokens[userId].token, userId, tokens[userId].fio]);

		StorageManager.set("token", tokensOutput);
		if (!tokensOutput.length)
			StorageManager.remove("profile_act");

		if (activeUserId !== 0) {
			StorageManager.set("profile_act", activeUserId);
		}
	};


	return {
		/**
		 * Request token for the first user in app
		 * @return {Promise}
		 */
		requestFirstToken: function AccountsManager_requestFirstToken() {
			return initAuthWebview().then(function (res) {

			}, function (errObj) {
				// chrome.runtime.sendMessage({
				// 	action: "appWontWorkWithoutAccessGranted",
				// 	from: oAuthRequestData,
				// 	reason: failReason
				// });
			});
		},

		/**
		 * Add another account into app
		 * @return {Promise}
		 */
		addNewAccount: function AccountsManager_addNewAccount() {
			return initAuthWebview().then(function (res) {

			}, function (errObj) {

			});
		},

		/**
		 * Update expired token for existing app user
		 * @return {Promise}
		 */
		updateExistingToken: function AccountsManager_updateExistingToken() {
			return initAuthWebview().then(function (res) {

			}, function (errObj) {

			});
		},

		setData: function (userId, token, fio) {
			if (tokens === null)
				parseTokens();

			if (fio !== undefined) {
				tokens[userId] = {
					token: token,
					fio: fio
				};
			} else {
				tokens[userId].token = token;
			}

			writeData();
		},

		drop: function (userId) {
			if (tokens === null)
				parseTokens();

			if (activeUserId === parseInt(userId, 10))
				activeUserId = 0;

			delete tokens[userId];
			writeData();
		},

		setFio: function (userId, value) {
			if (tokens === null)
				parseTokens();

			if (!tokens[userId])
				throw new RangeError("Token for user #" + userId + " doesn't exist");

			tokens[userId].fio = value;
			writeData();

			chrome.runtime.sendMessage({"action" : "accountFioLoaded"});
		},

		/**
		 * @return {Array} текущий активный профиль
		 */
		get current() {
			if (tokens === null)
				parseTokens();

			return tokens[activeUserId];
		},

		get currentUserId() {
			if (tokens === null)
				parseTokens();

			return activeUserId;
		},

		set currentUserId(userId) {
			activeUserId = parseInt(userId, 10);
			writeData();
		},

		/**
		 * @return {Object} список профилей вида {userId1: {Object}, userId2: {Object}, ...}
		 */
		get list() {
			if (tokens === null)
				parseTokens();

			return tokens;
		}
	};
})();
