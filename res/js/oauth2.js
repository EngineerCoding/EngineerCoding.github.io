
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
            .replace(/=/g, "");;
    }

    var baseAuthorizationUrl = "https://ameling-dev.eu.auth0.com";
    var authorizeEndpoint = "/authorize";
    var tokenEndpoint = "/oauth/token";

    var clientData = {
        "mail": {
            "client_id": "16yzhDL68OuGK5Duav23XcLyNyoVzKvR",
            "redirect_uri": "http://localhost:8080/mail-admin.html",
            "scope": "read:admin:mail write:admin:mail",
            "audience": "https://api.ameling.dev/mail"
        }
    };

    var keys = {
        "code": {
            "type": "oauthType",
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
        if (!window.localStorage || !window.crypto || !clientData[type]) {
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

                window.localStorage.setItem(keys.code.type, type);
                window.localStorage.setItem(keys.code.state, state);
                window.localStorage.setItem(keys.code.verifier, codeVerifier);

                var pkceCodeData = {
                    "code_challenge": toBase64(codeChallenge),
                    "code_challenge_method": "S256",
                    "response_type": "code",
                    "state": state
                };

                var authorizationObject = clientData[type];
                var queryString = generateQueryString(Object.assign({}, pkceCodeData, authorizationObject));

                return baseAuthorizationUrl + authorizeEndpoint + queryString;
            });
    };

    obj.canExecutePkceTokenFlow = function(type) {
        var storedType = window.localStorage.getItem(keys.code.type);
        if (storedType == null || storedType !== type || !clientData[type]) {
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

        var client = clientData[type];
        return {
            "grant_type": "authorization_code",
            "client_id": client.client_id,
            "redirect_uri": client.redirect_uri,
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
                // TODO: check access and id tokens!
                window.localStorage.setItem(keys.token.access, tokenData.access_token);
                window.localStorage.setItem(keys.token.scope, tokenData.scope);
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

        var timestamp = parseInt(tokenData["timestamp"]);
        tokenData["timestamp"] = new Date(timestamp);
        var expiresInTimestamp = timestamp + parseInt(tokenData["expires"]) * 1000;
        tokenData["expires"] = new Date(expiresInTimestamp);
        return tokenData;
    }

    obj.isValidTokenData = function(data) {
        if (!data) {
            data = this.getTokenData();
        }

        var currentTimestamp = (new Date()).getTime();
        var expiresInTimestamp = data["expires"].getTime();
        return currentTimestamp < expiresInTimestamp;
    }

    obj.getPkceCodeFlowPromise = function(type) {
        var pkceTokenData = obj.getPkceTokenData(type);
        if (pkceTokenData) {
            return obj.getTokenPromise(pkceTokenData)
                .then(function(result) {
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

    return obj;
})();
