var express = require("express");
var session = require("express-session");
var bodyParser = require("body-parser");
var db = require("./database_con.js");
var app = express();
var multer = require("multer"); 
var sendVerifyMail = require("./mail_send.js");
const path = require('path');

const port = process.env.PORT || 3000;


const cors=require("cors");
const corsConfig={
  origin:"*",
  credentials:true,
  methods:["GET","POST","PUT","DELETE"],
};
app.options("",cors(corsConfig));
app.use(cors{corsConfig});


app.set('views', path.join(__dirname, 'views'));
app.use(session({ secret: "test123!@#" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + req.session.userid + "-" + file.originalname);
  },
});

const profile_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = ""; // Default upload path

    // Determine upload path based on file type or other conditions
    if (file.fieldname === "h_img") {
      uploadPath = "public/header_pic/";
    } else if (file.fieldname === "p_img") {
      uploadPath = "public/profile_pic/";
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + req.session.userid + "-" + file.originalname);
  },
});

app.get("/", function (req, res) {
  var msg = "";
  if (req.session.msg != "") {
    msg = req.session.msg;
  }  
  res.render("login", { msg: msg });
});

app.post("/login_submit", function (req, res) {
  const { email, pass } = req.body;
  let sql = "";
  if (isNaN(email)) {
    sql =
      "select * from User where email = '" +
      email +
      "' and password = '" +
      pass +
      "' and status = 1 and softdelete = 0";
  } else {
    sql =
      "select * from User where mobile = '" +
      email +
      "' and password = '" +
      pass +
      "' and status = 1 and softdelete = 0";
  }
  db.query(sql, function (err, result, fields) {
    if (err) throw err;
    if (result.length == 0) {
      res.render("login", { msg: "Username or Password did not match !" });
    } else {
      req.session.userid = result[0].uid;
      req.session.un = result[0].username;
      res.redirect("/home");
    }
  });
});

app.post("/reg_submit", (req, res) => {
  const { uname, fname, mname, lname, email, pass, cpass, dob, gender } =
    req.body;
  let check_uname =
    "select username from User where username = '" + uname + "'";
  db.query(check_uname, function (err, result) {
    if (err) throw err;
    if (result.length > 0) {
      let errmsg = "Username already exists";
      res.render("signup", { errmsg: errmsg });
    } else {
      let sql_check = "";
      if (isNaN(email)) {
        sql_check = "select email from User where email = '" + email + "'";
      } else {
        sql_check = "select mobile from User where mobile = '" + email + "'";
      }
      db.query(sql_check, function (err, result, fields) {
        if (err) throw err;
        if (result.length == 1) {
          let errmsg = "";
          if (isNaN(email)) errmsg = "Email already exists";
          else errmsg = "Mobile No. already exists";
          res.render("signup", { errmsg: errmsg });
        } else {
          let sql = "";
          if (isNaN(email)) {
            sql =
              "insert into User(username,fname,mname,lname,email,password,dob,dor,gender) values (?,?,?,?,?,?,?,?,?)";
          } else {
            sql =
              "insert into User(username,fname,mname,lname,mobile,password,dob,dor,gender) values (?,?,?,?,?,?,?,?,?)";
          }
          let t = new Date();
          let m = t.getMonth() + 1;
          let dor = t.getFullYear() + "-" + m + "-" + t.getDate();
          db.query(
            sql,
            [uname, fname, mname, lname, email, pass, dob, dor, gender],
            function (err, result) {
              if (err) throw err;
              if (result.insertId > 0) {
                if (isNaN(email)) {
                  sendVerifyMail(email);
                }
                req.session.msg =
                  "Account created , Plz check email to verify email.";
                res.redirect("/");
              } else {
                res.render("signup", {
                  errmsg: "Can not complete signup, Try again",
                });
              }
            }
          );
        }
      });
    }
  });
});

app.get("/signup", function (req, res) {
  res.render("signup", { errmsg: "" });
});

app.get("/home", function (req, res) {
  if (req.session.userid != "") {
    let msg = "";
    if (req.session.msg != "") {
      msg = req.session.msg;
    }
    let profile_path = "select profilepic from User where uid = ?";
    db.query(profile_path, [req.session.userid], (err, result1) => {
      if (err) throw err;
      let sql =
        "select * from tweet inner join User on User.uid = tweet.uid where (tweet.uid = ? or tweet.uid in (select follow_id from user_follows where uid = ?) or tweet.post like '%" +
        req.session.un +
        "%') and tweet.softdelete=0 order by tweet.datetime desc";
      db.query(
        sql,
        [req.session.userid, req.session.userid],
        function (err, result) {
          if (err) throw err;
          let tags_query =
            "select tagname,count(*) as tag_count from tags group by tagname order by tag_count desc,MAX(datetime) DESC";
          db.query(tags_query, function (err, tags) {
            if (err) throw err;

            res.render("home", {
              result: result,
              msg: msg,
              userprofile: result1[0].profilepic,
              months: months,
              tags: tags,
              req: req.session.userid,
            });
          });
        }
      );
    });
  } else {
    req.session.msg = "Please login first to view home page";
    res.redirect("/");
  }
});

app.get("/logout", function (req, res) {
  req.session.userid = "";
  req.session.msg = "";
  res.redirect("/");
});

app.get("/profile", function (req, res) {
  if (req.session.userid != "") {
    let msg = "";
    if (req.session.msg != "") {
      msg = req.session.msg;
    }
    let user_sql = "select * from User where uid = ?";
    db.query(user_sql, [req.session.userid], (err, result) => {
      if (err) throw err;
      let tags_query =
        "select tagname,count(*) as tag_count from tags group by tagname order by tag_count desc,MAX(datetime) DESC";
      db.query(tags_query, function (err, tags) {
        if (err) throw err;

        /*followers*/
        let followers =
          "select * from User where uid in (select uid from user_follows where follow_id = ? and softdelete = 0) ";
        db.query(followers, [req.session.userid], (err, follower) => {
          if (err) throw err;

          /*following*/
          let followings =
            "select * from User where uid in (select follow_id from user_follows where uid = ? and softdelete = 0)";
          db.query(followings, [req.session.userid], (err, following) => {
            if (err) throw err;
            res.render("profile", {
              result: result,
              msg: msg,
              tags: tags,
              month: months,
              follower: follower,
              following: following,
            });
          });
        });
      });
    });
  } else {
    req.session.msg = "Please login first to view home page";
    res.redirect("/");
  }
});
app.get("/edit_profile", function (req, res) {
  db.query(
    "Select * from User where uid = ?",
    [req.session.userid],
    function (err, result, fields) {
      if (err) throw err;
      if (result.length == 1) {
        let tags_query =
          "select tagname,count(*) as tag_count from tags group by tagname order by tag_count desc,MAX(datetime) DESC";
        db.query(tags_query, function (err, tags) {
          if (err) throw err;
          res.render("editprofile", { result: result, msg: "", tags: tags });
        });
      } else {
        res.redirect("/");
      }
    }
  );
});
var upload_profile = multer({ storage: profile_storage });
app.post(
  "/edit_profile_submit",
  upload_profile.fields([
    { name: "p_img", maxCount: 1 },
    { name: "h_img", maxCount: 1 },
  ]),
  function (req, res) {
    const { fname, mname, lname, bio } = req.body;
    let profileFilename = "";
    let headerFilename = "";

    if (
      req.files["p_img"] &&
      req.files["p_img"][0] &&
      req.files["h_img"] &&
      req.files["h_img"][0]
    ) {
      profileFilename = req.files["p_img"][0].filename;
      headerFilename = req.files["h_img"][0].filename;

      let sqlupdate =
        "update User set fname = ? , mname = ? , lname = ? , about = ? ,profilepic = ?, headerpic = ? where uid = ?";

      db.query(
        sqlupdate,
        [
          fname,
          mname,
          lname,
          bio,
          profileFilename,
          headerFilename,
          req.session.userid,
        ],
        function (err, result) {
          if (err) throw err;
          if (result.affectedRows == 1) {
            req.session.msg = "Data Updated";
            res.redirect("/profile");
          } else {
            req.session.msg = "Can not update profile";
            res.redirect("/profile");
          }
        }
      );
    } else if (req.files["p_img"] && req.files["p_img"][0]) {
      console.log("No header image uploaded");
      profileFilename = req.files["p_img"][0].filename;

      let sqlupdate =
        "update User set fname = ? , mname = ? , lname = ? , about = ? ,profilepic = ? where uid = ?";

      db.query(
        sqlupdate,
        [fname, mname, lname, bio, profileFilename, req.session.userid],
        function (err, result) {
          if (err) throw err;
          if (result.affectedRows == 1) {
            req.session.msg = "Data Updated";
            res.redirect("/profile");
          } else {
            req.session.msg = "Can not update profile";
            res.redirect("/profile");
          }
        }
      );
    } else if (req.files["h_img"] && req.files["h_img"][0]) {
      console.log("No profile image uploaded");
      headerFilename = req.files["h_img"][0].filename;

      let sqlupdate =
        "update User set fname = ? , mname = ? , lname = ? , about = ? ,headerpic = ? where uid = ?";

      db.query(
        sqlupdate,
        [fname, mname, lname, bio, headerFilename, req.session.userid],
        function (err, result) {
          if (err) throw err;
          if (result.affectedRows == 1) {
            req.session.msg = "Data Updated";
            res.redirect("/profile");
          } else {
            req.session.msg = "Can not update profile";
            res.redirect("/profile");
          }
        }
      );
    } else {
      console.log("No image uploaded");

      let sqlupdate =
        "update User set fname = ? , mname = ? , lname = ? , about = ? where uid = ?";

      db.query(
        sqlupdate,
        [fname, mname, lname, bio, req.session.userid],
        function (err, result) {
          if (err) throw err;
          if (result.affectedRows == 1) {
            req.session.msg = "Data Updated";
            res.redirect("/profile");
          } else {
            req.session.msg = "Can not update profile";
            res.redirect("/profile");
          }
        }
      );
    }
  }
);

app.get("/explore", function (req, res) {
  if (req.session.userid != "") {
    let msg = "";
    if (req.session.msg != "") {
      msg = req.session.msg;
    }

    let tags_query =
      "select tagname,count(*) as tag_count from tags group by tagname order by tag_count desc,MAX(datetime) DESC";

    db.query(tags_query, function (err, tags) {
      if (err) throw err;

      let sql =
        "SELECT * FROM User WHERE uid NOT IN (SELECT follow_id FROM user_follows WHERE uid = ?) and uid!= ?";
      // Execute the SQL query
      db.query(
        sql,
        [req.session.userid, req.session.userid],
        (err, results) => {
          if (err) throw err;

          res.render("explore", { topUsers: results, msg: msg, tags: tags });
        }
      );
    });
  } else {
    req.session.msg = "Please login first !";
    res.redirect("/");
  }
});
app.get("/followsubmit", (req, res) => {
  const userId = req.query.userid;

  const currentUserId = req.session.userid;

  // Perform the follow operation in MySQL
  const sql = `INSERT INTO user_follows (uid, follow_id, datetime) VALUES (?, ?, NOW())`;
  db.query(sql, [currentUserId, userId], (err, result) => {
    if (err) throw err;

    res.redirect("/explore");
  });
});

var upload_detail = multer({ storage: storage });
app.post(
  "/tweet_submit",
  upload_detail.single("tweet_img"),
  function (req, res) {
    const { post } = req.body;

    var filename = "";
    var mimetype = "";
    try {
      filename = req.file.filename;
      mimetype = req.file.mimetype;
    } catch (err) {
      console.log(err);
    }

    var d = new Date();
    var m = d.getMonth() + 1;
    var ct =
      d.getFullYear() +
      "-" +
      m +
      "-" +
      d.getDate() +
      " " +
      d.getHours() +
      ":" +
      d.getMinutes() +
      ":" +
      d.getSeconds();
    let sql =
      "insert into tweet (uid,post,datetime,image_video_name,type) values (?,?,?,?,?)";
    db.query(
      sql,
      [req.session.userid, post, ct, filename, mimetype],
      function (err, result) {
        if (err) throw err;
        if (result.insertId > 0) {
          req.session.msg = "Tweet Done";

          const tags = post.match(/#(\w+)/g);
          if (tags && tags.length > 0) {
            let tag_sql = "insert into tags (tagname,datetime) values (?,?)";
            for (let i = 0; i < tags.length; i++) {
              db.query(tag_sql, [tags[i], ct], function (err, result) {
                if (err) throw err;
                console.log("Tags inserted successfully!");
              });
            }
          }
        } else {
          req.session.msg = "Can not tweet your post";
        }
        res.redirect("/home");
      }
    );
  }
);

app.post("/delete_tweet", (req, res) => {
  const tweetId = req.body.tid;
  const userId = req.session.userid;

  const checkOwnershipQuery = "SELECT uid FROM tweet WHERE tid = ?";
  db.query(checkOwnershipQuery, [tweetId], (err, result) => {
    if (err) throw err;

    if (result.length === 1 && result[0].uid === userId) {
      const deleteQuery = "UPDATE tweet SET softdelete = 1 WHERE tid = ? ;";
      db.query(deleteQuery, [tweetId], (deleteErr, deleteResult) => {
        if (deleteErr) throw deleteErr;

        res.redirect("/home");
      });
    } else {
      console.log("Hello");
      res.redirect("/home");
    }
  });
});

app.get("/changepassword", (req, res) => {
  if (!req.session.userid) {
    res.redirect("/");
    return;
  }
  let tags_query =
    "select tagname,count(*) as tag_count from tags group by tagname order by tag_count desc,MAX(datetime) DESC";
  db.query(tags_query, function (err, tags) {
    if (err) throw err;
    res.render("changepassword", { error: "", msg: "", tags: tags });
  });
});

app.post("/changepassword_submit", (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.userid;

  let tags_query =
    "select tagname,count(*) as tag_count from tags group by tagname order by tag_count desc,MAX(datetime) DESC";
  db.query(tags_query, function (err, tags) {
    if (err) throw err;

    if (newPassword !== confirmPassword) {
      res.render("changepassword", {
        error: "Passwords do not match",
        msg: "",
        tags: tags,
      });
    }

    db.query(
      "SELECT password FROM User WHERE uid = ?",
      [req.session.userid],
      (err, results) => {
        if (err) throw err;

        if (!results.length || results[0].password !== currentPassword) {
          res.render("changepassword", {
            error: "Current password is incorrect",
            msg: "",
            tags: tags,
          });
          return;
        }

        db.query(
          "UPDATE User SET password = ? WHERE uid = ?",
          [newPassword, userId],
          (updateErr, updateResult) => {
            if (updateErr) throw updateErr;
            res.redirect("/home");
          }
        );
      }
    );
  });
});

app.post("/unfollow", (req, res) => {
  const followedPerson = req.body.unfollowid;
  const userId = req.session.userid;

  const unfollowquery =
    "UPDATE user_follows SET softdelete = 1 WHERE uid = ? and follow_id = ? ;";
  db.query(unfollowquery, [userId, followedPerson], (err, result) => {
    if (err) throw err;
    res.redirect("/profile");
  });
});

app.post("/remove", (req, res) => {
  const userFollowingMe = req.body.removeid;
  const userId = req.session.userid;

  const RemoveQuery =
    "UPDATE user_follows SET softdelete = 1 WHERE uid = ? and follow_id = ? ;";
  db.query(RemoveQuery, [userFollowingMe, userId], (err, result) => {
    if (err) throw err;
    res.redirect("/profile");
  });
});

// SELECT *FROM tweet WHERE uid = ? or (uid IN (SELECT follow_id FROM user_follows WHERE uid = ?)) or username LIKE '%un%';

app.get("/verifymail", function (req, res) {
  let email = req.query["email"];
  let sql_update = "update User set status = 1 where email = ? ";
  db.query(sql_update, [email], (err, result) => {
    if (err) throw err;
    if (result.affectedRows == 1) {
      req.session.msg =
        "Email verified now you can login with your password and email";
      res.redirect("/");
    } else {
      req.session.msg = "Can not verify Email contact admin!";
      res.redirect("/");
    }
  });
});

app.listen(port, function () {
  console.log(`Server running at localhost ${port} port`);
});
