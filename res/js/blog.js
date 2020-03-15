(function() {
	var overviewContainer = document.getElementById("overview-container");
	var loadingContainer = document.getElementById("loading-container");

	var baseUrl = "/blog.html";

	function initBlogPost(blogPost, node) {
		var node = loadTemplate("card", {
			"card-image-source": blogPost.banner,
			"card-metadata": (new Date()).toLocaleString(),
			"card-title": blogPost.title
		}).children[0];

		var slug = blogPost.title.toLowerCase().replace(/\s/g, "-");
		node.addEventListener("click", function(event) {
			window.history.pushState(null, "", baseUrl + "#" + slug);
			renderPage();
		});

		overviewContainer.appendChild(node);
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

	function renderFullBlogPost(data) {
		console.log("Rendering full blog post");
	}

	function renderPage() {
		if (window.location.hash.length === 0) {
			loadingContainer.style.display = "none";
			overviewContainer.style.display = "flex";
		} else {
			overviewContainer.style.display = "none";
			loadingContainer.style.display = "flex";
			var slug = window.location.hash.substring(1);
			var data = window.sessionStorage.getItem(slug);
			if (data != null) {
				renderFullBlogPost(JSON.parse(data));
			} else {
				fetch("/res/data/blogs/" + slug + ".json")
					.then(function(response) {
						if (!response.ok) {
							window.location.href = "/404.html";
							return new Promise(function() { });
						}
						return response.json();
					})
					.then(function(data) {
						renderFullBlogPost(data);
						window.sessionStorage.setItem(slug, data);
						loadingContainer.style.display = "none";
					})
					.catch(renderGenericError);
			}
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

			blogPosts.forEach(initBlogPost);
			renderPage();
		})
		.catch(renderGenericError);

	window.addEventListener("popstate", renderPage);
})();
