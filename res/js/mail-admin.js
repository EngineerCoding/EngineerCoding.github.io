(function() {
    var itemsPerPage = 25;

    var contentContainer = document.getElementById("content-container");
    var managementContainer = document.getElementById("management-container");
    var loadingContainer = document.getElementById("loading-container");
    loadingContainer.style.display = "flex";

    var backwardControl = document.querySelector(".controls .fa-backward");
    var forwardControl = document.querySelector(".controls .fa-forward");
    var addControl = document.querySelector(".controls .fa-plus-square");

    var addTooltip = document.getElementById("add-tooltip");

    var crudApi;
    oauth2.getPkceCodeFlowPromise("mail")
        .then(function(data) {
            crudApi = new Crud("https://api.ameling.dev/mail/forwarding", {
                "Authorization": data.type + " " + data.access
            });
            initialize();
        });

    function deleteHandler(event) {
        var emailUser = this.parentElement.parentElement.getAttribute("data-email-user");
        crudApi.delete(emailUser).then(function(response) {
            moveToPage();
        });
    }

    function toggleBlacklistHandler(event) {
        var emailUser = this.parentElement.parentElement.getAttribute("data-email-user");
        var setBlacklisted = this.getAttribute("data-blacklisted") === "false";
        crudApi.update(emailUser, { blacklisted: setBlacklisted }).then(function() {
            moveToPage();
        });
    }

    var currentPage = 0;
    function showPage(pageIndex, refresh) {
        return crudApi.all(pageIndex, itemsPerPage).then(function(data) {
            currentPage = pageIndex;

            var items = data.items;
            if (items.length != itemsPerPage) {
                for (var i = items.length; i < itemsPerPage; i++) {
                    items.push(null);
                }
            }

            var rowElements = managementContainer.getElementsByTagName("tr");
            items.forEach(function(row, idx) {
                var created = false;
                var rowElement, user, tag, blacklisted, deletetd;
                if (idx < rowElements.length) {
                    rowElement = rowElements[idx];
                    user = rowElement.children[0];
                    tag = rowElement.children[1];
                    blacklisted = rowElement.children[2];
                    deletetd = rowElement.children[3];

                    for (var i = blacklisted.children.length - 1; i >= 0; i--) {
                        blacklisted.removeChild(blacklisted.children[0]);
                    }
                    for (var i = deletetd.children.length - 1; i >= 0; i--) {
                        deletetd.removeChild(deletetd.children[0]);
                    }
                } else {
                    created = true;
                    rowElement = document.createElement("tr");

                    user = document.createElement("td");
                    tag = document.createElement("td");
                    blacklisted = document.createElement("td");
                    blacklisted.classList.add("center-text");
                    deletetd = document.createElement("td");
                    deletetd.classList.add("center-text");
                }

                if (row != null) {
                    rowElement.setAttribute("data-email-user", row.emailUser);
                    user.innerText = row.emailUser;
                    tag.innerText = row.tag;

                    var blacklistedIcon = document.createElement("i");
                    blacklistedIcon.classList.add("fa", "pointer");
                    if (row.blacklisted) {
                        blacklistedIcon.classList.add("fa-check");
                        blacklistedIcon.style.color = "green";
                    } else {
                        blacklistedIcon.classList.add("fa-times");
                        blacklistedIcon.style.color = "red";
                    }
                    blacklistedIcon.setAttribute("data-blacklisted", row.blacklisted);
                    blacklistedIcon.addEventListener("click", toggleBlacklistHandler);
                    blacklisted.appendChild(blacklistedIcon);

                    var deleteIcon = document.createElement("i");
                    deleteIcon.classList.add("fa", "fa-trash", "pointer");
                    deleteIcon.style.color = "red";
                    deleteIcon.addEventListener("click", deleteHandler);
                    deletetd.appendChild(deleteIcon);
                } else {
                    user.innerText = "";
                    tag.innerText = "";
                }

                if (created) {
                    rowElement.appendChild(user);
                    rowElement.appendChild(tag);
                    rowElement.appendChild(blacklisted);
                    rowElement.appendChild(deletetd);

                    managementContainer.appendChild(rowElement);
                }
            });

            return data;
        });
    }

    function initialize() {
        moveToPage();

        backwardControl.addEventListener("click", moveToPageHandler(false));
        forwardControl.addEventListener("click", moveToPageHandler(true));

        addTooltip.style.display = "block";
        tippy(addControl, {content: addTooltip, interactive: true});

        var emailUserInput = addTooltip.querySelector("#email-user");
        var tagInput = addTooltip.querySelector("#tag");
        var blacklistedInput = addTooltip.querySelector("#blacklisted");
        addTooltip.querySelector("button").addEventListener("click", function() {
            if (emailUserInput.value.length > 0) {
                crudApi.create({
                    emailUser: emailUserInput.value,
                    tag: tagInput.value,
                    blacklisted: blacklistedInput.checked
                }).then(function() {
                    emailUserInput.value = "";
                    tagInput.value = "";
                    blacklisted.checked = false;
                    moveToPage();
                });
            }
        });
    }

    function moveToPageHandler(forward) {
        return function(event) {
            if (this.classList.contains("disabled")) {
                return;
            }

            var index = currentPage;
            if (forward) {
                index += 1;
            } else {
                index -= 1;
            }
            moveToPage(index);
        }
    }

    function updateControl(control, enabled) {
        if (enabled) {
            control.classList.remove("disabled");
        } else {
            control.classList.add("disabled");
        }
    }

    function moveToPage(pageIndex) {
        if (typeof pageIndex == "undefined") {
            pageIndex = currentPage;
        }

        contentContainer.style.display = "none";
        loadingContainer.style.display = "flex";

        showPage(pageIndex).then(function(responseData) {
            loadingContainer.style.display = "none";
            contentContainer.style.display = "flex";

            var canMoveForward = responseData.totalItemCount > (responseData.page + 1) * itemsPerPage;
            updateControl(forwardControl, canMoveForward);
            var canMoveBackward = pageIndex > 0;
            updateControl(backwardControl, canMoveBackward);
        });
    }

})();
