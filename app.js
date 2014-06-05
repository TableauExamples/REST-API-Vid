//
// Change these to your server's url (and port if not 80) and the site you wish to use it on.
//
var SERVERURL = "10.211.55.11";
var SITE = "rest"; 

//Loading of Module Dependencies
var XMLWriter = require('xml-writer');
var request = require("request");
var express = require("express");
var jsxml = require("node-jsxml");
var app = express();

//Express middleware set up
//Express is a web framework for NodeJS. This is what we're using to act as a web server
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.urlencoded());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser('Ronaldinho'));
app.use(express.session());

// When we query all of the users on the site, we will store them globally so that other pages can use them.
var userIDs = {};

//Routes
// This is how we tell the Express what to do and which page to load when the user navigates to different pages.
app.get('/', function(req,res) {
	// The first step to using the REST API is to log in. You can log in as an admin or a non-admin, but
	// Many of the functions only apply to admins. Logging in returns an auth token which must be placed in the header
	// of all future calls.
	// 
	// In this case we decide to get the token as soon as a user starts using our app. This happens transparently to the user,
	// but when this process begins depends on the design of your application/script.

	// If we don't have a login token (ie if this is the beginning of the session)
	// then we make a post to /api/2.0/auth/signin to login as an admin and store the
	// login token as part of the session cookie.
	if(!req.session.authToken) {
		//Build the XML payload
		// This will happen differently in different programming languages and depending on what library/module you
		// decide to do it with. Here I'm using a module called xml writer which simplifies the process.
		// To see what xml you need to build for each of the different calls, see the documentation.
		var reqxml = new XMLWriter();
		reqxml.startElement('tsRequest').startElement('credentials').writeAttribute('name', 'admin')
			.writeAttribute('password', 'admin').startElement('site').writeAttribute('contentUrl', '');
		request.post( 
			{
				url: 'http://' + SERVERURL + '/api/2.0/auth/signin',
				body: reqxml.toString(),
				headers: {'Content-Type': 'text/xml'}
			},
			// Express requests take a 'callback' function which will be called when the request has been processed. The
			// response from the server will be contained in the 3rd parameter 'body'.
			function(err, response, body) {
				if(err) {
					req.session.err = err;
				} else {
					// In order to grab information from the response, we turn it into an xml object and use a module
					// called node-jsxml to parse the xml. node-jsxml allows us to use child(), attribute(), and some other functions
					// to locate specific elements and pieces of information that we need.
					// Here, we need to grab the 'token' attribute and store it in the session cookie.
					var bodyXML = new jsxml.XML(body);
					req.session.authToken = bodyXML.child('credentials').attribute("token").getValue();
					console.log("Auth token: " + req.session.authToken);
				}
				// Rendering in Express loads an html page. EJS stands for embedded javascript. It can include dynamic variables, but when it
				// renders it compiles to html that the browser can load.
				res.render("index.ejs", {
					err: req.session.err
				});
				// Only display the error once
				req.session.err = null;
			}
		);	
	} else {
		res.render("index.ejs", {
			err: req.session.err
		});
		// Only display the error once
		req.session.err = null;

	}
});

// When a user submits the form to add a user, it makes a post request to /users and passes the name of the user
// via req.body.Username. the code below handles that post request by calling the REST API's function to add
// a user.
app.post('/users', function(req,res) {
	console.log("Request to add user: " + req.body.Username);
	// We will add the user to the specified site but first we have to get the id of that site.
	// This is a common theme with the REST API. If you want to do something in a specific site, you must
	// query that site to find out it's id. Similarly, if you want to do something with a specific user,
	// you have to query to find that user's id.
	request(
		{
			url: 'http://' + SERVERURL + '/api/2.0/sites/' + SITE + '?key=name',
			headers: {
				'Content-Type': 'text/xml',
				'X-Tableau-Auth': req.session.authToken
			}
		},

		function(err, response, body) {
			if(err) {
				req.session.err = err;
				res.redirect('/');
			} else {
				var bodyXML = new jsxml.XML(body);
				req.session.SiteID = bodyXML.child('site').attribute("id").getValue();
				console.log("site id: " + req.session.SiteID);
			}
			// OK. We have the site, and we've stored it in the session cookie, now we add our new user to that site.

			//First, build the XML for the POST
			var reqxml = new XMLWriter();
			reqxml.startElement('tsRequest').startElement('user')
				.writeAttribute('name', req.body.Username).writeAttribute('role', 'Interactor')
				.writeAttribute('publish', 'true').writeAttribute('contentAdmin','false')
				.writeAttribute('suppressGettingStarted', 'true');
			request.post( 
				{
					url: 'http://' + SERVERURL + '/api/2.0/sites/' + req.session.SiteID + '/users/',
					body: reqxml.toString(),
					headers: {
						'Content-Type': 'text/xml',
						'X-Tableau-Auth': req.session.authToken
					}
				},
				function(err, response, body) {
					if(err) {
						req.session.err = err;
					} else {
						//If the request was succesful we get xml back that contains the id and name of the added user.
						var bodyXML = new jsxml.XML(body);
						var userID = bodyXML.child('user').attribute('id').getValue();
						var userName = bodyXML.child('user').attribute('name').getValue();
						console.log(userName + " added with user id " + userID);
					}
					res.redirect('/users');
				}
			);	
		}
	);	
});

// Navigating to /users with the browser (as opposed to making a POST to users) will render a page
// with the list of users on the server, on the specified site.
app.get('/users', function(req,res) {
	console.log("List of users requested.");
	// We will grab the list of users from the specified site, but first we have to grab the site id
	// (Same idea as when we added users. We could have checked if req.session.SiteID has been populated,
	// but I chose to keep it simple instead)
	request(
		{
			url: 'http://' + SERVERURL + '/api/2.0/sites/' + SITE + '?key=name',
			headers: {
				'Content-Type': 'text/xml',
				'X-Tableau-Auth': req.session.authToken
			}
		},
		function(err, response, body) {
			if(err) {
				req.session.err = err;
				res.redirect('/');
			} else {
				var bodyXML = new jsxml.XML(body);
				req.session.SiteID = bodyXML.child('site').attribute("id").getValue();
				console.log("site id: " + req.session.SiteID);
			}
			// OK. We have the site, now let's grab the list of users
			// Since we're just making a GET request, we don't need to build the xml. All the is needed
			// is the SiteID which is inserted in the url and the auth token which is included in the headers
			request( 
				{
					url: 'http://' + SERVERURL + '/api/2.0/sites/' + req.session.SiteID + '/users/',
					headers: {
						'Content-Type': 'text/xml',
						'X-Tableau-Auth': req.session.authToken
					}
				},
				function(err, response, body) {
					if(err) {
						req.session.err = err;
					} else {
						// A succesful request returns xml with a <users> which contains multiple <user> elements.
						// The <user> elements have name attributes and id attributes which we'll grab, store in a
						// javascript object and render those in the html that loads.
						var bodyXML = new jsxml.XML(body);
						bodyXML.descendants('user').each(function(item, index) {
							userIDs[item.attribute('name').getValue()] = item.attribute('id').getValue();
						});
						for(var user in userIDs) {
							console.log(user + " " + userIDs[user]);
						}
					}
					res.render("users.ejs", {
						err: req.session.err,
						userIDs: userIDs
					});
					// Only display the error once
					req.session.err = null;
				}
			);	
		}
	);
});

// On the list of users page, a user can click on a user's name. That will link them to /users/<username>.
// This is the route that handles that. It queries for all of the workbooks published by that user and then
// prints them out.
app.get('/users/:user', function(req, res) {
	console.log('Requested: workbooks published by ' + req.params.user);
	var workbooks = [];
	// This is a similar GET request to getting the list of users. The difference is that instead of querying
	// .../users/userid we query .../users/userid/workbooks
	request( 
		{
			url: 'http://' + SERVERURL + '/api/2.0/sites/' + req.session.SiteID 
				+ '/users/' + userIDs[req.params.user] + '/workbooks',
			headers: {
				'Content-Type': 'text/xml',
				'X-Tableau-Auth': req.session.authToken
			}
		},
		function(err, response, body) {
			if(err) {
				req.session.err = err;
			} else {
				// The returned xml is similar to the users xml. It contains a <workbooks> element that contains multiple
				// <workbook> elements. We will grab the name attribute from each workbook, store it in an array and 
				// render it in a list in the html.
				var bodyXML = new jsxml.XML(body);
				bodyXML.descendants('workbook').each(function(item, index) {
					workbooks.push(item.attribute('name').getValue());
				});
				for(var i = 0; i < workbooks.length; i++) {
					console.log(workbooks[i]);
				}
			}
			res.render("user.ejs", {
				err: req.session.err,
				user: req.params.user,
				userID: userIDs[req.params.user],
				workbooks: workbooks
			});
			// Only display the error once
			req.session.err = null;
		}
	);	
});

//Start this thing
var port = Number(process.env.PORT || 8001);
app.listen(port);
console.log("Listening on port " + port);