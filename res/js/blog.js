(function() {
    var overviewContainer = document.getElementById("overview-container");
    var contentContainer = document.getElementById("content-container");
    var loadingContainer = document.getElementById("loading-container");
    var logoContainer = document.getElementById("logo");
    var linkLogo = document.getElementById("link");
    loadingContainer.style.display = "flex";
    linkLogo.style.display = "none";

    var baseUrl = "/blog.html";

    var blogPosts = {};

    // In case we are embedded in an iframe
    document.domain = window.location.host.split(":")[0];

    // Copy to button logic
    function setCurrentSlug(slug) {
        if (slug) {
            linkLogo.setAttribute("title", "https://api.ameling.dev/opengraph/" + slug);
        } else {
            linkLogo.setAttribute("title", "");
        }
    }

    linkLogo.addEventListener("click", function() {
        var url = this.getAttribute("title");
        if (url) {
            if (window.navigator.clipboard) {
                window.navigator.clipboard.writeText(url)
                    .then(function() {
                        alert("Copied to clipboard!");
                    });
            } else {
                var textArea = document.createElement("textarea");
                textArea.value = url;
                // Avoid scrolling
                textArea.style.bottom = "100%";
                textArea.style.left = 0;
                textArea.style.position = "fixed";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                alert("Copied to clipboard!");
            }
        }
    });

    function getHeaderData(blogPost, imageKey, metadataKey, titleKey) {
        return {
            [imageKey]: blogPost.banner,
            [metadataKey]: (new Date(blogPost.published * 1000)).toLocaleString(),
            [titleKey]: blogPost.title
        };
    }

    function initOverviewItem(blogPost) {
        var node = loadTemplate("card", getHeaderData(blogPost, "card-image-source", "card-metadata", "card-title"));

        var slug = blogPost.title.toLowerCase().replace(/\s/g, "-");
        blogPosts[slug] = blogPost;
        node.addEventListener("click", function(event) {
            window.history.pushState(null, "", baseUrl + "#" + slug);
            renderPage();
        });

        return new Promise(function(resolve, reject) {
            overviewContainer.appendChild(node);
            // Wait for the images to load
            var loadedCount = 0;
            var images = overviewContainer.getElementsByTagName("img");
            for (var i = 0; i < images.length; i++) {
                images[i].addEventListener("load", function(evt) {
                    loadedCount += 1;
                    if (loadedCount == images.length) {
                        resolve();
                    }
                });
            }
        });
    }

    function renderGenericError() {
        var loadingSpinner = loadingContainer.querySelector(".loading");
        loadingContainer.removeChild(loadingSpinner);
        var error = document.createElement("h1");
        error.classList.add("default-font");
        error.style.color = "red";
        error.innerText = "Something went wrong!";
        loadingContainer.appendChild(error);
    }

    function renderAction(action) {
        var actionComponents = action.match(/'[\s\w/:%=?\.\[\]@]+'|[\w/:%=?\.\[\]@]+/g);
        if (actionComponents == null) {
            throw new Error("No action found!");
        }

        actionComponents = actionComponents.map(function(component) {
            component = component.trim();
            if (component.startsWith("'") && component.endsWith("'")) {
                return component.substring(1, component.length - 1);
            }
            return component;
        });

        if (actionComponents[0] == "a") {
            var visual = actionComponents[1];
            var a = document.createElement("a");
            a.target = "_blank";
            a.rel = "noopener";
            a.href = actionComponents[actionComponents.length >= 3 ? 2 : 1];
            a.appendChild(document.createTextNode(visual));
            return a;
        } else if (actionComponents[0] == "code") {
            var node = renderBlogPostNode({ type: "code", content: actionComponents[1] });
            node.style.display = "inline";
            return node;
        } else {
            throw new Error("Action not found: " + JSON.stringify(actionComponents));
        }
    }

    var actionRegex = /{%(.+?)%}/;
    function inlineTextRender(text) {
        var collection = document.createDocumentFragment();
        var match = text.match(actionRegex);
        while (match != null) {
            collection.appendChild(
                document.createTextNode(text.substring(0, match.index)));
            collection.appendChild(renderAction(match[1].trim()));
            text = text.substring(match.index + match[0].length);
            match = text.match(actionRegex);
        }
        collection.appendChild(document.createTextNode(text));
        return collection;
    }

    function renderItems(root, dataNodes, modifyNode) {
        dataNodes.map(renderBlogPostNode)
            .forEach(function(node) {
                if (modifyNode) {
                    node = modifyNode(node);
                }
                root.appendChild(node);
            });
        return root;
    }

    function renderBlogPostNode(postDataNode) {
        if (typeof postDataNode === "string") {
            return inlineTextRender(postDataNode);
        } else if (postDataNode.type === "collection") {
            var collection = document.createDocumentFragment();
            return renderItems(collection, postDataNode.items);
        } else if (postDataNode.type === "ol" || postDataNode.type === "ul") {
            var root = document.createElement(postDataNode.type);
            return renderItems(root, postDataNode.items, function(node) {
                var li = document.createElement("li");
                li.appendChild(node);
                return li;
            });
        } else if (postDataNode.type === "paragraph") {
            var p = document.createElement("p");
            p.appendChild(inlineTextRender(postDataNode.content));
            return p;
        } else {
            var templateName = "bp-" + postDataNode.type;
            return loadTemplate(templateName, postDataNode);
        }
    }

    function renderFullBlogPost(slug, data) {
        // Clear the previous post
        while (contentContainer.children.length > 0) {
            contentContainer.removeChild(contentContainer.children[contentContainer.children.length - 1]);
        }

        var header = loadTemplate("bp-header", getHeaderData(blogPosts[slug], "image-source", "metadata", "title"));
        var childrenCount = header.children.length;
        for (var i = 0; i < childrenCount; i++) {
            contentContainer.appendChild(header.children[0]);
        }

        var content = renderBlogPostNode({type: "collection", items: data});
        contentContainer.appendChild(content);
    }

    function renderPage() {
        if (window.location.hash.length === 0) {
            loadingContainer.style.display = "none";
            contentContainer.style.display = "none";
            overviewContainer.style.display = "flex";
            logoContainer.style.display = "block";
            setCurrentSlug(null);
        } else {
            overviewContainer.style.display = "none";
            contentContainer.style.display = "none";
            loadingContainer.style.display = "flex";
            var slug = decodeURIComponent(window.location.hash.substring(1));
            setCurrentSlug(slug);
            var data = window.sessionStorage.getItem(slug);
            if (data != null) {
                renderFullBlogPost(slug, JSON.parse(data));
                loadingContainer.style.display = "none";
                logoContainer.style.display = "none";
                linkLogo.style.display = "block";
            } else {
                fetch("/res/data/blogs/" + slug + ".json")
                    .then(function(response) {
                        if (!response.ok) {
                            parent.window.location.href = "/404.html";
                            return new Promise(function() { });
                        }
                        return response.json();
                    })
                    .then(function(data) {
                        renderFullBlogPost(slug, data);
                        loadingContainer.style.display = "none";
                        logoContainer.style.display = "none";
                        linkLogo.style.display = "block";
                        window.sessionStorage.setItem(slug, JSON.stringify(data));
                    })
                    .catch(renderGenericError);
            }
            contentContainer.style.display = "flex";
        }
    }

    fetch("/res/data/blog_posts.json")
        .then(function(response) {
            return response.json();
        })
        .then(function(blogPosts) {
            blogPosts.sort(function(a, b) {
                return b.published - a.published;
            });

            return Promise.all(blogPosts.map(initOverviewItem));
        })
        .then(function() {
            renderPage();
        })
        .catch(renderGenericError);

    window.addEventListener("popstate", renderPage);
})();
