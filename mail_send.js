var nodemailer=require('nodemailer');
require('dotenv').config();


async function sendVerifyMail(to_email){
    let transporter =nodemailer.createTransport({
        service:"gmail",
        host:"smtp.gmail.com",
        port:465,
        secure:false,
        auth:{
            user:process.env.MAIL_USER,
            pass:process.env.MAIL_PASS
        }  
    });
    let info=transporter.sendMail({
        to:to_email,
        from:process.env.MAIL_USER,
        subject: "Verify email to QuickWings",
        html: "<h2 style = \"color:red\">Please click on link to verify email id </h2> <a href=\"http://localhost:3000/verifymail?email="+to_email+"\">Click here to verify email </a>"
    });
    if(info.messageId){
        return true;
    }
    else{
        return false;
    }
};
module.exports=sendVerifyMail;


