var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var request = require("request");
var cheerio = require("cheerio");
var path = require("path");

var Article = require('./models/Article.js');
var Comment = require('./models/Comment.js');

var app = express();

app.use(express.static(path.join(__dirname, 'public')));


app.use(bodyParser.urlencoded({ extended: false }))

var exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');


app.use(bodyParser.urlencoded({
  extended: false
}));
// app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/mongoscrape");
var db = mongoose.connection;

db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

db.once("open", function() {
  console.log("Mongoose connection successful.");
});

var router = express.Router();
app.use('/', router);
//renders the index page
router.get('/', function(req, res) {

  res.redirect('/articles');
});

//Scrapes Kotaku's home page for articles
router.get('/scrape', function(req, res) {
  request("http://www.espn.com/", function(error, response, html) {
    var $ = cheerio.load(html);

    $("article").each(function(i, element){
      var result = {};

      result.title = $(this).children("header").children("h1").children("a").text();
      if (result.title != "" && result.title != null) {
        result.link = $(this).children("header").children("h1").children("a").attr("href");
        result.summary = $(this).children(".item__content").children(".entry-summary").children("p").text();
  

        //Checks to see if the article is already in the database, and if it isn't then it adds it
        Article.findOne({title: result.title}, function(err, doc) {
          if (doc == null) {
            var entry = new Article(result);

            entry.save(function(err, doc) {
              if (err) {
                console.log(err);
              }
              else {
                console.log(doc);
              }
            });
          }
          else {
            console.log('Already in DB');
          }
        });
          
        // });
      }
    });
  });
  res.send("Scrape Complete");
});

//displays article links
router.get('/articles', function(req, res) {
  Article.find(function(err, doc) {
    articlesObject = {articles: doc};
    res.render('index', articlesObject);
  });
});

//gets the individual article along with its notes
router.get('/articles/:id', function(req, res) {
  Article.findOne({_id: req.params.id})
  .populate("comments")
  .exec(function(err, doc) {
    console.log(doc);
    articleObject = {article: doc};
    res.render('article', articleObject);
  });
});

//posts a new comment
router.post('/articles/:id/comment/create', function(req, res) {
  var newComment = new Comment(req.body);

  newComment.save(function(err, doc) {
    if (err) {
      console.log(error);
    }
    else {
      Article.findOneAndUpdate({"_id": req.params.id}, {$push: {"comments": doc._id}}, {new: true})
      .exec(function(err, doc) {
        if (err) {
          console.log(err);
        }
        else {
          res.redirect('/articles/' + req.params.id);
        }
      });
    }
  });
});

//deletes a comment
router.post('/articles/comment/:id2/delete', function(req, res) {
  // var threadId = req.params.id1;
  var commentId = req.params.id2;

  Comment.findByIdAndRemove(commentId, function(err, doc) {
    if (err) {
      console.log(err);
    } 
    else {
      // res.redirect('/articles/' + threadId);
      res.redirect('back');
    }
  });
});

var port = 3000;
app.listen(port, function() {
  console.log('App listening on PORT: ' + port);
});