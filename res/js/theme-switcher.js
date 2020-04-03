var switchTheme = (function() {
    function getReplaceThemeAction(node, querySelector, from, to) {
        var elements = [];

        if (node.classList && node.classList.contains(from)) {
            elements.push(node);
        }

        var selectedElements = node.querySelectorAll(querySelector);
        for (var i = 0; i < selectedElements.length; i++) {
            elements.push(selectedElements[i]);
        }

        return function() {
            elements.forEach(function(element) {
                element.classList.remove(from);
                element.classList.add(to);
            });
        };
    }

    var switcherElement = document.querySelector("header");

    function toggleTheme(node) {
        var lightToDark = getReplaceThemeAction(node, ".stx-light", "stx-light", "stx-dark");
        var darkToLight = getReplaceThemeAction(node, ".stx-dark", "stx-dark", "stx-light");

        lightToDark();
        darkToLight();
    }

    function toggleThemeComplete() {
        toggleTheme(document);

        var icon = switcherElement.getElementsByTagName("i")[0];
        if (icon.classList.contains("fa-moon-o")) {
            icon.classList.remove("fa-moon-o");
            icon.classList.add("fa-sun-o");
            window.currentTheme = "dark";
        } else {
            icon.classList.remove("fa-sun-o");
            icon.classList.add("fa-moon-o");
            window.currentTheme = "light";
        }

        var firstPath = document.getElementById("logo-path-a");
        var secondPath = document.getElementById("logo-path-b");
        if (firstPath != null && secondPath != null) {
            if (window.currentTheme === "light") {
                firstPath.style.fill = "#EAEAEA";
                firstPath.style.stroke = "black";
                secondPath.style.stroke = "black";
            } else {
                firstPath.style.fill = "#404040";
                firstPath.style.stroke = "white";
                secondPath.style.stroke = "white";
            }
        }

        if (window.localStorage) {
            window.localStorage.setItem("theme", window.currentTheme);
        }
    }

    window.currentTheme = "dark";
    if (window.localStorage) {
        var newTheme = window.localStorage.getItem("theme");
        if (newTheme !== null && window.currentTheme !== newTheme) {
            window.currentTheme = newTheme;
            toggleThemeComplete();
        }
    }

    switcherElement.addEventListener("click", function() {
        toggleThemeComplete();
    });

    return toggleTheme;
})();
