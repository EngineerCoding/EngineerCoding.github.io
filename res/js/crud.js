
var Crud = (function() {
    return function(baseUrl, headers) {
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/";
        }

        function wrappedFetch(url, options) {
            if (!options) {
                options = {};
            }
            if (!options.headers) {
                options.headers = {};
            }
            options.headers = Object.assign({}, options.headers, headers);

            return fetch(baseUrl + url, options)
                .then(function(response) {
                    if (response.ok) {
                        return response.json();
                    } else if (response.status == 401 && oauth2) {
                        var type = oauth2.getCurrentType();
                        oauth2.getPkceCodeRedirectUrlPromise(type)
                            .then(function(url) {
                                top.window.location.href = url;
                            });
                    }
                    return Promise.reject();
                });
        }

        function getDataOptions(method, data) {
            return {
                "method": method,
                "headers": {
                    "Content-Type": "application/json;charset=utf-8"
                },
                "body": JSON.stringify(data)
            };
        }

        var obj = {};
        obj.all = function(page, pageCount) {
            var uri = "all";

            var queryParameters = {};
            if (typeof page !== "undefined") {
                queryParameters.page = page;
            }
            if (typeof pageCount !== "undefined") {
                queryParameters.pageCount = pageCount;
            }
            var queryString = (new URLSearchParams(queryParameters)).toString();
            if (queryString.length > 0) {
                uri += "?" + queryString;
            }

            return wrappedFetch(uri);
        }

        obj.get = function(item) {
            return wrappedFetch(item);
        }

        obj.create = function(data) {
            return wrappedFetch("create", getDataOptions("POST", data));
        }

        obj.update = function(item, data) {
            return wrappedFetch(item, getDataOptions("PUT", data));
        }

        obj.delete = function(item) {
            return wrappedFetch(item, { "method": "DELETE" });
        }

        return obj;
    }
})();
