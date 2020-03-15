(function() {
	function initBlogPost(blogPost) {

	}

	var main = document.getElementsByTagName("main")[0];

	function renderBlogPost(blogPost) {
		var postEntry = loadTemplate("card", {
			"card-image-source": blogPost.banner,
			"card-metadata": (new Date()).toLocaleString(),
			"card-title": blogPost.title
		});
		initBlogPost(blogPost);
		main.appendChild(postEntry);
	}

	fetch("/res/data/blog_posts.json")
		.then(function(response) {
			return response.json();
		})
		.then(function(blogPosts) {
			blogPosts.sort(function(a, b) {
				return b.published - a.published;
			});

			main.innerHTML = "";
			main.classList.remove("centered-component");
			main.classList.add("items-component");
			blogPosts.forEach(renderBlogPost);
		});
})();
