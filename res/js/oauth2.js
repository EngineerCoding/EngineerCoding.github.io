
var oauth2 = (function() {
    function generateQueryString(queryParameters) {
        var searchParams = new URLSearchParams(queryParameters);
        return "?" + searchParams.toString();
    }

    function toBase64(buffer) {
        return btoa(new Uint8Array(buffer).reduce(function(data, byte) {
            return data + String.fromCharCode(byte)
        }, ""))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");
    }

    var baseAuthorizationUrl = "https://ameling-dev.eu.auth0.com";
    var callbackDomain = "https://ameling.dev/";
    var authorizeEndpoint = "/authorize";
    var tokenEndpoint = "/oauth/token";

    var clientData = {
        "client_id": "E7mr6gn02JEHiY2yS37wJ2V1PAL95bdJ",
        "audience": "https://api.ameling.dev"
    };

    var redirectUris = {
        "mail": callbackDomain + "mail-admin.html",
        "opengraph": callbackDomain + "opengraph-admin.html"
    }

    var keys = {
        "type": "oauthType",
        "code": {
            "state": "oauthState",
            "verifier": "oauthCodeVerifier",
        },
        "token": {
            "type": "oauthTokenType",
            "scope": "oauthScopes",
            "timestamp": "oauthTokenReceivedTimestamp",
            "expires": "oauthTokenExpiresIn",
            "access": "oauthAccessToken",
            "refresh": "oauthRefreshToken",
        }
    }

    var obj = {};

    obj.getPkceCodeRedirectUrlPromise = function(type) {
        if (!window.localStorage || !window.crypto || !redirectUris[type]) {
            return Promise.reject();
        }

        var codeVerifier = toBase64(window.crypto.getRandomValues(new Uint8Array(32)));
        var codeVerifierBuffer = new Uint8Array(codeVerifier.length);
        for (var i = 0; i < codeVerifier.length; i++) {
            codeVerifierBuffer[i] = codeVerifier.charCodeAt(i);
        }

        return window.crypto.subtle.digest("SHA-256", codeVerifierBuffer)
            .then(function(codeChallenge) {
                var state = toBase64(window.crypto.getRandomValues(new Uint8Array(32)));

                window.localStorage.setItem(keys.type, type);
                window.localStorage.setItem(keys.code.state, state);
                window.localStorage.setItem(keys.code.verifier, codeVerifier);

                var pkceCodeData = {
                    "code_challenge": toBase64(codeChallenge),
                    "code_challenge_method": "S256",
                    "response_type": "code",
                    "state": state
                };

                var queryData = Object.assign({
                    "redirect_uri": redirectUris[type]
                }, pkceCodeData, clientData);
                var queryString = generateQueryString(queryData);

                return baseAuthorizationUrl + authorizeEndpoint + queryString;
            });
    };

    obj.canExecutePkceTokenFlow = function(type) {
        var storedType = window.localStorage.getItem(keys.type);
        if (storedType == null || !redirectUris[storedType]) {
            return false;
        }

        var storedState = window.localStorage.getItem(keys.code.state);
        var storedCodeVerifier = window.localStorage.getItem(keys.code.verifier);
        if (storedState == null || storedCodeVerifier == null) {
            return false;
        }

        var queryParameters = new URLSearchParams(window.location.search);
        var state = queryParameters.get("state");
        if (state != storedState) {
            return;
        }

        var code = queryParameters.get("code");
        if (code == null) {
            return false;
        }

        return true;
    }

    obj.getPkceTokenData = function(type) {
        if (!obj.canExecutePkceTokenFlow(type)) {
            return;
        }

        var storedCodeVerifier = window.localStorage.getItem(keys.code.verifier);

        Object.values(keys.code).forEach(function(key) {
            window.localStorage.removeItem(key);
        });

        var queryParameters = new URLSearchParams(window.location.search);
        var code = queryParameters.get("code");

        return {
            "grant_type": "authorization_code",
            "client_id": clientData.client_id,
            "redirect_uri": redirectUris[type],
            "code_verifier": storedCodeVerifier,
            "code": code,
        };
    }

    obj.getTokenPromise = function(data) {
        return fetch(baseAuthorizationUrl + tokenEndpoint , { "method": "POST", "body": new URLSearchParams(data) })
            .then(function(response) {
                if (!response.ok) {
                    return Promise.reject();
                }
                return response.json();
            })
            .then(function(tokenData) {
                window.localStorage.setItem(keys.token.access, tokenData.access_token);
                if (tokenData.scope) {
                    window.localStorage.setItem(keys.token.scope, tokenData.scope);
                }
                if (tokenData.refresh_token) {
                    window.localStorage.setItem(keys.token.refresh, tokenData.refresh_token);
                }
                window.localStorage.setItem(keys.token.type, tokenData.token_type);
                window.localStorage.setItem(keys.token.timestamp, (new Date()).getTime());
                window.localStorage.setItem(keys.token.expires, tokenData.expires_in);
                return Promise.resolve(true);
            })
            .catch(function() {
                return Promise.resolve(false);
            });
    }

    obj.getTokenData = function() {
        var tokenData = {};
        var containsAllKeys = Object.keys(keys.token).reduce(function(acummulator, key) {
            tokenData[key] = window.localStorage.getItem(keys.token[key]);
            return acummulator && typeof tokenData[key] != null;
        }, true);

        var timestamp = parseInt(tokenData.timestamp);
        tokenData.timestamp = new Date(timestamp);
        var expiresInTimestamp = timestamp + parseInt(tokenData.expires) * 1000;
        tokenData.expires = new Date(expiresInTimestamp);
        tokenData.getAuthorizationHeader = function() {
            return tokenData.type + " " + tokenData.access;
        }

        return tokenData;
    }

    obj.isValidTokenData = function(data) {
        if (!data) {
            data = this.getTokenData();
        }

        var currentTimestamp = (new Date()).getTime();
        var expiresInTimestamp = data["expires"].getTime();
        if (currentTimestamp < expiresInTimestamp) {
            if (typeof clientData.scope !== "undefined") {
                var requiredScopes = clientData.scope.split(" ");
                var availableScopes = (data.scope || "").split(" ");
                return requiredScopes.every(function(scope) {
                    return availableScopes.indexOf(scope) !== -1;
                });
            }
            return true;
        }
        return false;
    }

    obj.getPkceCodeFlowPromise = function(type) {
        var pkceTokenData = obj.getPkceTokenData(type);
        if (pkceTokenData) {
            return obj.getTokenPromise(pkceTokenData)
                .then(function(result) {
                    if (window.history) {
                        var loc = window.location;
                        window.history.replaceState({}, document.title,
                            loc.protocol + "//" + loc.host + loc.pathname);
                    }

                    if (result) {
                        return Promise.resolve(obj.getTokenData());
                    } else {
                        return Promise.reject();
                    }
                });
        } else {
            var oauthData = obj.getTokenData();
            if (!obj.isValidTokenData(oauthData)) {
                return obj.getPkceCodeRedirectUrlPromise(type).then(function(url) {
                    window.location.replace(url);
                    return Promise.reject();
                });
            }
            return Promise.resolve(oauthData);
        }
    }

    obj.getRedirectUri = function(type) {
        return redirectUris[type];
    }

    obj.setCurrentType = function(type) {
        if (redirectUris[type]) {
            return window.localStorage.setItem(keys.type, type);
        }
    }

    obj.getCurrentType = function() {
        return window.localStorage.getItem(keys.type);
    }

    return obj;
})();
