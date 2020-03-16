
var loadTemplate = (function() {
	var fillValuePattern = /{{\s*([\w\-]+)\s*}}/;

	function findReplacement(value, fillOptions) {
		var result = value.match(fillValuePattern);
		if (result != null) {
			var key = result[1];
			if (typeof fillOptions[key] === "undefined") {
				throw new Error("Key " + key + " not defined in fillOptions!")
			}
			return { apply: true, replace: result[0], with: fillOptions[key] };
		}
		return { apply: false };
	}

	function loopReplacements(fillOptions, getString, replaceString) {
		while (true) {
			var searchString = getString();
			var result = findReplacement(searchString, fillOptions);
			if (result.apply) {
				replaceString(searchString.replace(result.replace, result.with));
			} else {
				break;
			}
		}
	}

	function fillNode(node, fillOptions) {
		// Replace innerHTML
		loopReplacements(fillOptions, function() {
			return node.innerHTML
		}, function(value) {
			node.innerHTML = value;
		});
		// replace attributes
		for (var i = 0; i < node.attributes.length; i++) {
			if (node.attributes[i].specified) {
				var attribute = node.attributes[i];
				loopReplacements(fillOptions, function() {
					return attribute.value;
				}, function(value) {
					attribute.value = value;
				});
			}
		}
	}

	return function(identifier, fillOptions) {
		var element = document.getElementById(identifier);
		if (element == null) {
			throw new Error("Could not find element with identifier " + identifier);
		}
		if (element.nodeName !== "TEMPLATE") {
			throw new Error("Element is not a template");
		}

		var node = element.content.cloneNode(true).children[0];
		if (fillOptions) {
			fillNode(node, fillOptions);
		}

		if (switchTheme && window.currentTheme !== "dark") {
			switchTheme(node);
		}

		return node;
	}
})();
