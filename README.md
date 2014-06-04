##REST-API-Vid
============

Companion NodeJS web application example for the tableausoftware.com's on-demand tutorial video for the 8.2 REST API
(Link to video to come)

This is a very basic example of using Tableau Server's REST API for Server administration as part of a customer web portal.
The portal does 4 things:
-Logs in to the Server as an admin
-Queries the list of users on the site called 'rest'
-Queries the list of workbooks published by specific users
-Creates a new user and adds them to the site 'rest'

The video also covers use of a POSTMAN collection which will help in learning and testing the REST API.
For that collection please see (github link to follow).

###How to use these files
In order to use these files you will have to have [NodeJS](http://nodejs.org/) installed. NodeJS is Server Side JavaScript which allows the development of web applications in JavaScript.
After downloading the files and installing NodeJS you can navigate with a command-line to the folder where these files live and enter:
######npm install
This will download all of the required modules
Then you can enter:
#####node app.js

*Note: the folder that node lives in will have to be in your PATH environment variable, or else you will have to specific the full address of node in these commands.

