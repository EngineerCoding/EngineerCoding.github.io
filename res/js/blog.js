(function() {
	function initBlogPost(blogPost) {

	}

	function renderBlogPost(blogPost) {
		var postEntry = loadTemplate("card", {
			"card-image-source": blogPost.banner,
			"card-metadata": (new Date()).toLocaleString(),
			"card-title": blogPost.title
		});
		initBlogPost(blogPost);
		document.getElementsByTagName("main")[0].appendChild(postEntry);
	}

	fetch("/res/data/blog_posts.json")
		.then(function(response) {
			return response.json();
		})
		.then(function(blogPosts) {
			blogPosts.sort(function(a, b) {
				return (a.published - b.published) * -1;
			});
			blogPosts.forEach(renderBlogPost);
		});
})();
