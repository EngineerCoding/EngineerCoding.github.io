
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

	function fillNode(node, fillOptions) {
		while (true) {
			var result = findReplacement(node.innerHTML, fillOptions);
			if (result.apply) {
				node.innerHTML = node.innerHTML.replace(result.replace, result.with);
			} else {
				break;
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

		var cloned = element.content.cloneNode(true);
		if (fillOptions) {
			for (var i = 0; i < cloned.children.length; i++) {
				fillNode(cloned.children[i], fillOptions);
			}
		}

		return cloned;
	}
})();
