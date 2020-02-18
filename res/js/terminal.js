var getTerminal = (function() {
	var addCss = function(cssUrl, excludeType) {
		var links = document.head.querySelectorAll("link[type=\"text/css\"]");
		for (var i = 0; i < links.length; i++) {
			if (links[i].getAttribute("href") == cssUrl) {
				return new Promise(function(resolve, reject) {
					resolve();
				});
			}
		}

		return new Promise(function(resolve, reject) {
			var link = document.createElement("link");
			if (!excludeType) {
				link.setAttribute("type", "text/css");
			}
			link.setAttribute("rel", "stylesheet");
			link.setAttribute("href", cssUrl);
			link.addEventListener("load", function(event) {
				resolve();
			});

			document.head.appendChild(link);
		});
	}

	var createIconButton = function(text, clickCallback) {
		var iconButton = document.createElement("i");
		iconButton.classList.add("material-icons");
		iconButton.style.cursor = "pointer";
		iconButton.innerText = text;
		iconButton.addEventListener("click", clickCallback);
		return iconButton;
	}

	var createTextElement = function(text, cssClasses) {
		var span = document.createElement("span");
		span.innerText = text;

		var addCssClass = function(cssClass) {
			span.classList.add(cssClass);
		}

		if (Array.isArray(cssClasses)) {
			cssClasses.forEach(addCssClass);
		} else if (cssClasses) {
			addCssClass(cssClasses);
		}

		return span;
	}

	var getFromPersistence = function(key, _default, jsonParse, storage) {
		if (!storage) storage = window.localStorage;
		if (storage) {
			var data = storage.getItem(key);
			if (data) {
				return jsonParse ? JSON.parse(data) : data;
			}
		}
		return _default;
	}

	var setPersistent = function(key, value, jsonStringify, storage) {
		if (!storage) storage = window.localStorage;
		if (storage) {
			storage.setItem(
				key, jsonStringify ? JSON.stringify(value) : value);
		}
	}

	var FileSystem = function() {
		var obj = {}

		var displayPath = getFromPersistence("path", "~", false);
		var files = [];
		var structure = {};

		obj.getInitializationPromise = function() {
			return fetch("/res/data/files.json")
				.then(function(response) {
					return response.json();
				})
				.then(function(fileData) {
					files = fileData;
					files.forEach(function(file, idx) {
						var pathComponents = file.path.split("/");
						pathComponents.splice(0, 1);

						var final = pathComponents.splice(pathComponents.length - 1, 1);
						// build the directory structure
						var base = structure;
						pathComponents.forEach(function(directory) {
							if (typeof base[directory] === "undefined") {
								base[directory] = {};
							}
							base = base[directory];
						});
						// add the file if final is not empty
						if (final.length != 0) {
							base[final] = idx;
						}
					});
				})
		}

		obj.getCurrentPath = function() {
			return displayPath;
		}

		obj.getCurrentAbsolutePath = function() {
			var absolutePath = this.normalize("");
			return absolutePath.substring(0, absolutePath.length - 1);
		}

		obj.join = function() {
			if (arguments.length == 0) return "";
			var pathComponents = Array.from(arguments);
			pathComponents = pathComponents.map(function(path, idx) {
				if (idx > 0 && path.startsWith("/")) {
					path = path.substring(1, path.length);
				}
				if (idx < (pathComponents.length - 1) && path.endsWith("/")) {
					path = path.substring(0, path.length - 1);
				}
				return path;
			});
			return pathComponents.join("/");
		}

		obj.normalize = function(path) {
			if (!path.startsWith("/") && !path.startsWith("~")) {
				path = this.join(this.getCurrentPath(), path);
			}
			// handle ~
			path = path.replace("~", "/home/guest");
			// handle .
			var pathComponents = path.split("/");
			pathComponents = pathComponents.filter(function(pathComponent) {
				return pathComponent != ".";
			});
			// handle ..
			var previousDirIndex = pathComponents.indexOf("..");
			while (previousDirIndex != -1) {
				// Remove the previous path part
				// The first part is empty and is root; can't go beyond that
				if (previousDirIndex - 1 != 0) {
					pathComponents.splice(previousDirIndex - 1, 2);
				} else {
					pathComponents.splice(previousDirIndex, 1);
				}

				previousDirIndex = pathComponents.indexOf("..");
			}

			if (pathComponents.length == 1) {
				return "/";
			}
			return pathComponents.join("/");
		}

		obj.getObject = function(normalizedPath) {
			return normalizedPath.split("/")
				.filter(function(pathComponent) {
					return pathComponent.length != 0;
				})
				.reduce(function(fsStructure, item) {
					if (fsStructure) {
						fsStructure = fsStructure[item];
					}
					return fsStructure;
				}, structure);
		}

		obj.getFileItem = function(idx) {
			return files[idx];
		}

		obj.setCurrentPath = function(path) {
			var normalizedPath = this.normalize(path);
			var result = this.getObject(normalizedPath);
			if (typeof result == "undefined") {
				return "file or folder does not exist";
			} else if (typeof result == "number") {
				return "not a folder";
			}

			if (!path.startsWith("~") && !path.startsWith("/")) {
				path = this.join(this.getCurrentPath(), path);
			}

			displayPath = path;
			setPersistent("path", path, false);
		}

		return obj;
	}

	var availableCommands = {
		'clear': function(terminal, commandArguments) {
			terminal.clear();
		},
		'exit': function(terminal, commandArguments) {
			terminal.destroy();
		},
		'pwd': function(terminal, commandArguments) {
			terminal.output(terminal.fs.getCurrentAbsolutePath());
		},
		'cd': function(terminal, commandArguments) {
			if (commandArguments.length > 0) {
				var error = terminal.fs.setCurrentPath(commandArguments[0]);
				if (error) {
					terminal.output(commandArguments[0] + ": " + error);
				}
			}
		},
		'ls': function(terminal, commandArguments) {
			if (commandArguments.length == 0) {
				commandArguments.push(terminal.fs.getCurrentPath());
			}
			var path = terminal.fs.normalize(commandArguments[0]);
			var pathItem = terminal.fs.getObject(path);

			if (typeof pathItem === "undefined") {
				terminal.output(commandArguments[0] + ": file or folder does not exist");
			} else if (typeof pathItem === "number") {
				var fileObject = terminal.fs.getFileItem(pathItem);
				var pathComponents = fileObject.path.split("/");
				terminal.output(pathComponents[pathComponents.length - 1], false, "file");
			} else {
				Object.keys(pathItem).forEach(function(component, idx) {
					if (idx % 4 == 0 && idx != 0) {
						terminal.output("");
					}
					var type = typeof pathItem[component] == "number" ? "file" : "directory";
					if (idx != 0) {
						terminal.output(" ", false, undefined, true);
					}
					terminal.output(component, false, type, true);
				});
				terminal.output("");
			}
		},
		'cat': function(terminal, commandArguments) {
			if (commandArguments.length == 0) {
				terminal.output("expected argument");
				return;
			}

			var normalizedPath = terminal.fs.normalize(commandArguments[0]);
			var pathItem = terminal.fs.getObject(normalizedPath);

			if (typeof pathItem === "undefined") {
				terminal.output(path + ": file or folder does not exist");
			} else if (typeof pathItem === "number") {
				terminal.setBlocking(true);
				fetch(terminal.fs.getFileItem(pathItem).href, { cache: "force-cache" })
					.then(function(response) {
						return response.text();
					})
					.then(function(text) {
						terminal.output(text, true);
						terminal.setBlocking(false);
					});
				return true;
			} else {
				terminal.output(path + ": is a folder");
			}
		},
		'enter': function(terminal, commandArguments) {
			if (commandArguments.length == 0) {
				terminal.output("expected argument");
				return;
			}

			var normalizedPath = terminal.fs.normalize(commandArguments[0]);
			var pathItem = terminal.fs.getObject(normalizedPath);

			if (typeof pathItem === "number") {
				var fileObject = terminal.fs.getFileItem(pathItem);
				if (fileObject.type === "link") {
					window.location.href = fileObject.href;
					return;
				}
			}

			terminal.output(commandArguments[0] + ": not a enter-able file");
		},
		'su': function(terminal, commandArguments) {
			if (commandArguments.length > 0) {
				setPersistent("user", commandArguments[0], false, window.sessionStorage);
			}
			window.location.href = "/login.html";
		}
	};

	var parseCommand = function(commandText) {
		commandText = commandText.trim();

		var openingArgument = null;
		var previousBackslash = false;

		var commandArguments = [""];
		var argumentIndex = 0;
		for (var i = 0; i < commandText.length; i++) {
			if (previousBackslash) {
				previousBackslash = false;
				commandArguments[argumentIndex] += commandText[i];
			} else if (commandText[i] == "\\") {
				previousBackslash = true;
			} else if (openingArgument != null && commandText[i] == openingArgument) {
				openingArgument = null;
			} else if (openingArgument == null && (commandText[i] == "'" || commandText[i] == "\"")) {
				openingArgument = commandText[i];
			} else if (/\s/.test(commandText[i])) {
				// Move on to the next parameter
				if (commandArguments[argumentIndex].length != 0) {
					commandArguments.push("");
					argumentIndex += 1;
				}
			} else {
				commandArguments[argumentIndex] += commandText[i];
			}
		}

		if (commandArguments.length == 1 && commandArguments[0].length == 0) {
			return { empty: true, command: null, arguments: null, original: commandText };
		} else {
			var command = commandArguments[0];
			commandArguments.splice(0, 1);
			return { empty: false, command: command, arguments: commandArguments, original: commandText };
		}
	}

	var Terminal = function(parentElement) {
		if (!parentElement) {
			parentElement = document.body;
		}

		var currentCommandContainer;
		var obj = {
			fs: new FileSystem(),
			active: true,
			destroyed: false,
			minimized: false,
			blocking: false,
		};

		obj.commandHistory = getFromPersistence("history", [], true);
		obj.commandHistoryIndex = obj.commandHistory.length;

		var destroyedHandlers = [];

		obj.element = document.createElement("div");
		obj.element.classList.add("terminal");

		var theme = "dark";
		if (typeof window.currentTheme !== "undefined") {
			theme = window.currentTheme;
		}
		obj.element.classList.add("stx-" + theme);

		var toolbar = document.createElement("div");
		var _cachedComputedProperties;
		toolbar.classList.add("toolbar");
		toolbar.appendChild(createIconButton("minimize", function (event) {
			obj.element.style.height = obj.minimized ? "" : (function() {
				if (_cachedComputedProperties == null) {
					_cachedComputedProperties = getComputedStyle(toolbar);
				}
				return _cachedComputedProperties.height;
			})();
			this.innerText = obj.minimized ? "minimize" : "maximize";

			obj.minimized = !obj.minimized;
			obj.active = !obj.minimized;

			if (obj.minimized) {
				var elements = document.getElementsByClassName("sticky-bottom");
				for (var i = 0; i < elements.length; i++) {
					elements[i].classList.add("sticky-bottom-toolbar-fix");
				}
			}
		}));
		toolbar.appendChild(createIconButton("close", function (event) {
			obj.destroy();
		}));

		var commandContainer = document.createElement("div");
		commandContainer.classList.add("command-container");

		var blinkingCursor = document.createElement("span");
		blinkingCursor.classList.add("blinking-cursor");
		commandContainer.appendChild(blinkingCursor);
		commandContainer.appendChild = function(element) {
			commandContainer.insertBefore(element, this.blocking ? currentCommandContainer : blinkingCursor);
			commandContainer.scrollTop = commandContainer.scrollHeight;
		}

		// Append it to the DOM
		obj.element.appendChild(toolbar);
		obj.element.appendChild(commandContainer);

		// Load the css and add the element to the DOM
		Promise.all([
			addCss("/res/css/components/terminal.css"),
			addCss("https://fonts.googleapis.com/icon?family=Material+Icons", true),
			obj.fs.getInitializationPromise()
		]).then(function() {
			parentElement.appendChild(obj.element);
		});

		obj.toggleMinimize = function() {
			toolbar.childNodes[0].click();
		}

		obj.onKeyPress = function(event) {
			if (!this.active || this.blocking) return;

			// Check if we are dealing with a printable character
			var input = event.key.trim();
			if (input.length == 1) {
				currentCommandContainer.innerText += input;
			} else {
				if (event.keyCode == 8) { /* backspace */
					var command = currentCommandContainer.innerText;
					if (command.length > 0) {
						currentCommandContainer.innerText = command.substring(0, command.length - 1);
					}
				} else if (event.keyCode == 9) { /* tab */
					event.preventDefault();
					this.attemptTabCompletion();
				} else if (event.keyCode == 13) { /* enter */
					event.preventDefault();
					this.executeCommand();
					this.commandHistoryIndex = this.commandHistory.length;
				} else if (event.keyCode == 32) { /* space bar */
					currentCommandContainer.innerHTML += "&nbsp;";
				} else if (event.keyCode == 38) { /* arrow up */
					event.preventDefault();
					if (this.commandHistoryIndex != 0 && this.commandHistory.length > 0) {
						this.commandHistoryIndex = this.commandHistoryIndex - 1;
						currentCommandContainer.innerText = this.commandHistory[this.commandHistoryIndex].original;
					}
				} else if (event.keyCode == 40) { /* arrow down */
					event.preventDefault();
					if (this.commandHistoryIndex != this.commandHistory.length) {
						this.commandHistoryIndex += 1;
						if (this.commandHistoryIndex == this.commandHistory.length) {
							currentCommandContainer.innerText = "";
						} else {
							currentCommandContainer.innerText = this.commandHistory[this.commandHistoryIndex].original;
						}
					}
				}
			}
		}

		obj.setupNewCommand = function(needEmpty) {
			if (needEmpty) {
				if (currentCommandContainer.innerText.length == 0) {
					return;
				}
				commandContainer.appendChild(document.createElement("br"));
			}

			commandContainer.appendChild(
				createTextElement("guest@" + (window.location.host || "localhost")));
			commandContainer.appendChild(createTextElement(":"));

			var currentPath = this.fs.getCurrentPath();
			if (currentPath.startsWith("~")) {
				commandContainer.appendChild(createTextElement("~", "stx-cnst"));
				commandContainer.appendChild(createTextElement(currentPath.substring(1), "stx-path"));
			} else {
				commandContainer.appendChild(createTextElement(currentPath, "stx-path"));
			}
			commandContainer.appendChild(createTextElement(" $ "));
			currentCommandContainer = document.createElement("span");
			commandContainer.appendChild(currentCommandContainer);
		}

		obj.attemptTabCompletion = function() {
			var text = currentCommandContainer.innerText;
			if (text.length > 0 && !(/\s/.test(text[text.length - 1]))) {
				var commandData = parseCommand(text);
				if (commandData.arguments.length > 0) {
					// assuming this looks like a path
					var pathComponents = commandData.arguments[
						commandData.arguments.length - 1].split("/");
					var lookStartsWith = pathComponents[pathComponents.length - 1];
					pathComponents.splice(pathComponents.length - 1, 1);

					var directoryPath = this.fs.normalize(pathComponents.join("/"));
					var pathObject = this.fs.getObject(directoryPath);

					if (typeof pathObject === "object") {
						var matchingKeys = Object.keys(pathObject).filter(function(key) {
							return key.startsWith(lookStartsWith);
						});

						var completeTo = null;
						if (matchingKeys.length > 0) {
							completeTo = matchingKeys[0];
						}
						if (matchingKeys.length > 1) {
							matchingKeys.splice(0, 1);
							completeTo = matchingKeys.reduce(function(currentOverlap, key) {
								if (currentOverlap == lookStartsWith) return currentOverlap;

								var minLength = Math.min(currentOverlap.length, key.length);
								for (var i = minLength; i > lookStartsWith.length; i--) {
									var currentOverlapSub = currentOverlap.substring(0, i);
									var keySub = key.substring(0, i);

									if (currentOverlapSub == keySub) {
										return currentOverlapSub;
									}
								}
								return lookStartsWith;
							}, completeTo);
						}

						// Actually auto fill
						if (completeTo != null) {
							var autoComplete = completeTo.substring(lookStartsWith.length);
							if (typeof pathObject[completeTo] == "object") {
								autoComplete += "/";
							}

							currentCommandContainer.innerText += autoComplete;
						}
					}
				}
			}
		}

		obj.output = function(outputText, usePre, cssClasses, excludeBreak) {
			if (usePre) {
				var block = document.createElement("pre");
				if (!Array.isArray(cssClasses)) {
					cssClasses = cssClasses ? [cssClasses] : [];
				}
				cssClasses.forEach(function (cssClass) {
					block.classList.add(cssClass);
				});

				block.innerText = outputText;
				commandContainer.appendChild(block);
			} else {
				var lines = outputText.split("\n");
				lines.forEach(function(line) {
					commandContainer.appendChild(createTextElement(line, cssClasses));
					if (!excludeBreak) {
						commandContainer.appendChild(document.createElement("br"));
					}
				});
			}
		}

		obj.setBlocking = function(blocking) {
			this.blocking = Boolean(blocking);
			if (!this.blocking) {
				this.setupNewCommand();
			}
		}

		obj.executeCommand = function(dontStore) {
			commandContainer.appendChild(document.createElement("br"));

			var commandData = parseCommand(currentCommandContainer.innerText);
			if (!commandData.empty) {
				var childrenCount = commandContainer.childNodes.length;

				if (!dontStore) {
					this.commandHistory.push(commandData);
					setPersistent("history", this.commandHistory, true);
				}

				if (typeof availableCommands[commandData.command] !== "undefined") {
					var asyncCommand = availableCommands[
						commandData.command](this, commandData.arguments);
					if (asyncCommand) return;
				} else {
					this.output(commandData.command + ": command not found");
				}
			}

			this.setupNewCommand();
		}

		obj.clear = function() {
			for (var i = commandContainer.childNodes.length - 1; i >= 0; i--) {
				var element = commandContainer.childNodes[i];
				if (element != blinkingCursor) {
					commandContainer.removeChild(element);
				}
			}
		}

		obj.addOnDestroyedHandler = function(handler) {
			destroyedHandlers.push(handler);
		}

		obj.destroy = function() {
			this.active = false;
			this.destroyed = true;

			var elements = document.getElementsByClassName("sticky-bottom");
			for (var i = 0; i < elements.length; i++) {
				elements[i].classList.remove("sticky-bottom-toolbar-fix");
			}

			parentElement.removeChild(this.element);
			destroyedHandlers.forEach(function(handler) { handler(); });
		}

		// Add an input for mobile devices
		var mobileInput = document.createElement("input");
		mobileInput.setAttribute("type", "text");

		commandContainer.addEventListener("touchmove", function(event) {
			mobileInput.focus();
		});

		var previousLength = 0;
		mobileInput.addEventListener("input", function(event) {
			if (previousLength == this.value.length) {
				return;
			}

			event.preventDefault();

			var code;
			var key = "";
			if (previousLength > this.value.length) {
				code = 8; /* backspace */
			} else {
				key = this.value[this.value.length - 1];
				code = key.charCodeAt(0);
			}

			previousLength = this.value.length;
			terminal.onKeyPress({ keyCode: code, key: key });
		});

		obj.element.appendChild(mobileInput);
		obj.setupNewCommand();
		return obj;
	}

	var terminal;
	var initTerminal = function(event) {
		var created = false;

		if (!event) {
			event = { altKey: true, code: "KeyT" };
		}

		if ((!terminal || terminal.destroyed) && event.altKey && event.code == "KeyT") {
			var keypressListener = function(event) {
				terminal.onKeyPress(event);
			};

			created = true;
			terminal = new Terminal();
			terminal.addOnDestroyedHandler(function() {
				document.removeEventListener("keydown", keypressListener);
				document.addEventListener("keydown", initTerminal);
			});
			document.addEventListener("keydown", keypressListener);
		}

		return {terminal: terminal, created: created};
	}

	document.addEventListener("keydown", initTerminal);

	return initTerminal;
})();
