(function() {
    oauth2.getPkceCodeFlowPromise("mail")
        .then(function(data) {
            console.log(data);
        })
        .catch(function() {
            console.log("error..");
        })
})();
