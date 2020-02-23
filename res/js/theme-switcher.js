(function() {
	function getReplaceThemeAction(querySelector, from, to) {
		var elements = document.querySelectorAll(querySelector);
		return function() {
			for (var i = 0; i < elements.length; i++) {
				elements[i].classList.remove(from);
				elements[i].classList.add(to);
			}
		};
	}

	var switcherElement = document.querySelector("header");

	function toggleTheme() {
		var lightToDark = getReplaceThemeAction(".stx-light", "stx-light", "stx-dark");
		var darkToLight = getReplaceThemeAction(".stx-dark", "stx-dark", "stx-light");

		lightToDark();
		darkToLight();

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
			toggleTheme();
		}
	}

	switcherElement.addEventListener("click", function() {
		toggleTheme();
	});
})();
