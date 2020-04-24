(function() {
    var navCheckbox = document.getElementById("nav-button");
    var navCheckboxLabel = document.querySelector("label[for=\"nav-button\"]");

    navCheckbox.addEventListener("click", function(event) {
        event.preventDefault();

        var input = this;
        setTimeout(function() {
            input.checked = !input.checked;
        }, 130);

        navCheckboxLabel.children[0].classList.remove("pulse");
    });

    // Initialize the pulse when the user has not been here before
    if (window.localStorage && window.localStorage.getItem("init-nav") === null) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "/res/css/components/nav-pulse.css";
        document.head.appendChild(link);

        navCheckboxLabel.children[0].classList.add("pulse");
        //window.localStorage.setItem("init-nav", "1");
    }

    var entering = false;

    var findParentElement = function(element, elementName) {
        elementName = elementName.toUpperCase();
        while (element.nodeName != elementName) {
            element = element.parentElement;
        }
        return element;
    }

    var executeCommand = function(terminal, command, callback) {
        terminal.setupNewCommand(true);

        var charIndex = 0;
        var intervalId = setInterval(function() {
            if (charIndex == command.length) {
                terminal.executeCommand();
                navCheckbox.checked = false;
                charIndex += 1;

                if (callback) callback();
                clearInterval(intervalId);
            } else {
                var eventData;
                var character = command[charIndex];
                if (/\s/.test(character)) {
                    eventData = { key: "", keyCode: 32 }; /* spacebar */
                } else {
                    eventData = { key: character };
                }

                document.dispatchEvent(new KeyboardEvent("keydown", eventData));
                charIndex += 1;
            }
        }, 75);
    }

    var navAnchors = document.querySelectorAll("nav a");
    for (var i = 0; i < navAnchors.length; i++) {
        navAnchors[i].addEventListener("click", function(event) {
            if (!entering) {
                event.preventDefault();
                entering = true;

                var terminalData = createOrGetTerminal();
                var terminal = terminalData.terminal;

                if (terminal.minimized) {
                    terminal.toggleMinimize();
                }

                var enterCommand = function() {
                    setTimeout(function() {
                        var url = new URL(findParentElement(event.target, "a").href);
                        var fileName = url.pathname.substring(1);
                        executeCommand(terminal, "enter " + fileName, function() {
                            entering = false;
                        });

                    }, terminalData.created ? 500 : 50);
                }

                if (terminal.fs.getCurrentAbsolutePath() != "/home/guest") {
                    setTimeout(function() {
                        terminalData.created = false;
                        executeCommand(terminal, "cd ~", enterCommand);
                    }, terminalData.created ? 500 : 50);
                } else {
                    enterCommand();
                }
            }
        });
    }
})();
