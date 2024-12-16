const Quote = require("../model/quote");
const logger = require("../config/winston");
const {db} = require("../db_config");
const nodemailer = require("nodemailer");


exports.send_mail = async (to, cc, subject, html, attachment) => {
    try {
      bcc = ["technical@kstinfotech.com", "yars@yuviony.com"];
      // "gomathi.sitaram@gmail.com"
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_Mail_Host,
        port: process.env.SMTP_Mail_port,
        secureConnection: false,
        auth: {
          user: process.env.SMTP_TO_EMAIL,
          pass: process.env.SMTP_TO_PASSWORD,
        },
        tls: { ciphers: "SSLv3" },
      });
  
      const sendMail = await transporter.sendMail({
        from: process.env.SMTP_TO_EMAIL,
        to,
        cc,
        bcc,
        subject,
        html,
        ...(attachment ? { attachments: [attachment] } : {}),
      });
      return sendMail;
    } catch (error) {
      return error;
    }
  };

exports.send_mail_to_sign = async (req, res, next) => {
    const { to, cc, reqId } = req.body;
    console.log(to, cc, reqId)
    try {
      if (to.length == 0) {
        throw "Error Missing Data";
      }
      const quote = await Quote.findOne({ reqId });
      console.log(quote,"dsdsdsfsdfsfs")
  
      const toArray = to.map((item) => item.mail);
      const ccArray = cc.map((item) => item.mail);
      const docuSignUrl = `${process.env.APP_PATH}/onesify/crossconnect_domestic/common/share_and_sign/${reqId}/${to[0].name}/${to[0].mail}`;
  
      const subject = "Sign the Enclosed Document - Sify";
  
      const html = `<html>
        <head>
            <title>Crossconnect Domestic Template</title>
        </head>
        <body>
            <div style="background-color:#ffffff; margin: 1px; font-size: 16px; color: #474747;font-family:'Myriad Pro', sans-serif" width="100%">
                <br/>
                <table align="center" border="0" cellpadding="0" cellspacing="0"
                    width="70%" bgcolor="white" >
                    <tbody>
                        <tr style="border: none;
                        background-color: #ffffff;
                        height: 40px;
                        color:white;
                        padding-bottom: 20px;
                        text-align: left;">
                            <td height="50px" align="left">
                            <a href="" style="border: 0; text-decoration:none;">
                                    <!--[if mso]>
                                    <table width="50%"><tr><td><img width="200" src="https://www.sifytechnologies.com/wp-content/uploads/2022/04/logo_007800781_2166.png" alt="One Sify" style="text-align: right; width: 207px; border: 0; text-decoration:none; vertical-align: baseline;"></td></tr></table>
                                        <div style="display:none">
                                        <![endif]-->
                                        <!--[if mso]>
                                        </div>
                                    <![endif]-->
                                    <!--[if !mso]>-->
                                        <img  src="https://www.sifytechnologies.com/wp-content/uploads/2022/04/logo_007800781_2166.png" alt="One Sify" style="text-align: right; min-width: 50px; max-width: 207px; border: 0; text-decoration:none; vertical-align: baseline;">
                                    <!--<![endif]-->
                                </a>
                                <hr/>
                            </td>
                        </tr>
                        <tr style="display: inline-block;">
                            <td style="
                            border: none;
                            background-color: white;
                            padding-left: 25px;
                            padding-right: 25px;">
                                <p>Dear <span style="font-size: 18px; color: #0E3346;">${to[0].name}</span></p>
                                <p>The user ${req.firstName} ${req.lastName} from the company ${quote.companyName} has shared the document for your signature.</p>
                                <br/>
                            </td>
                        </tr>
        
                        <!-- Green Card -->
                        <tr style="display: inline-block;">
                            <td style="height: 150px;
                                    width: 100%;
                                    padding-left: 25px;
                                    padding-right: 25px;
                                    border: none;
                                    background-color: white;">
                                    <!--[if mso]>
                                        <table style="width: 100%;
                                        height: 100px;
                                        background: #E9EBEC;
                                        padding: 25px;
                                        box-sizing: border-box;
                                        border-radius: 5px;
                                        color: #FFF;">
                                            <tr>
                                                <td style="border-radius: 2px; text-align: left;">
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.APP_PATH}/onesify/p2p/docu_sign/view_sign_order/P2P-SO-${reqId}"  style="background-color: #E9EBEC;
            ">                                          color: #FFFFFF;
                                                        padding: 20px;
                                                        margin: 50px;
                                                        padding-left: 50px;
                                                        border-radius: 5px;
                                                    <w:anchorlock/>
                                                    <center style="background-color: #0E3346;
                                                        border: none;
                                                        border-radius: 5px;
                                                        font-family: 'Myriad Pro', sans-serif;
                                                        color: #fff;
                                                        padding: 15px 32px;
                                                        text-align: center;
                                                        text-decoration: none;
                                                        display: inline-block;
                                                        font-size: 16px;
                                                        margin: 20px 0px;
                                                        cursor: pointer;">Click Here to Sign</center>
                                                    </v:roundrect>
                                                </td>
                                            </tr>
                                        </table>
                                <![endif]-->
                                <!--[if !mso]>-->
                                    <table style="width: 100%;
                                        height: 100px;
                                        background: #E9EBEC;
                                        padding: 15px;
                                        border-radius: 5px;
                                        box-sizing: border-box;
                                        color: #FFF;">
                                        <tr>
                                            <td style="border-radius: 2px; text-align: left;">
                                                <a href="${docuSignUrl}" target="_blank" style="background-color: #0E3346;
                                                            border: none;
                                                            border-radius: 5px;
                                                            font-family: 'Myriad Pro', sans-serif;
                                                            color: #fff;
                                                            padding: 15px 32px;
                                                            text-align: center;
                                                            text-decoration: none;
                                                            display: inline-block;
                                                            font-size: 16px;
                                                            margin: 20px 0px;
                                                            cursor: pointer;">
                                                    Click Here to Sign
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                <!--<![endif]-->
                                <h4>(or)</h4>
                                <p style="margin-bottom: 0px;">Click the link</p>
                                <p>
                                <a href="${docuSignUrl}" class="link">${process.env.APP_PATH}</a>
                                </p>
                                <br>
                                <p class="bestRegards">Best Regards,</p>
                                <p>Sify Team</p>
                                <p><a href="mailto:online.sales@sifycorp.com" target="_blank" class="link">online.sales@sifycorp.com</a>
                                </p>
                                <br>
                                <p>If you do not recognize this activity or did not initiate the request, report to the above email id.</p>
                                <br>
                            </td>
                        </tr>
                        <tr style="display: inline-block;">
                            <td style="height: 150px;
                                    padding: 20px;
                                    border: none;
                                    background-color: white;">
                                    <h4>Headquarters</h4>
                                    <p>II Floor, TIDEL Park,<br/>
                                    No.4, Rajiv Gandhi Salai, Taramani,<br/>
                                    Chennai - 600 113, India</p>
                                    <br>
                            </td>
                        </tr>
                        <td style="
                                font-size:16px; line-height:18px;
                                color:#0A2134;" valign="top" align="center">
                                <p>This is an auto generated mail. Please do not reply.<br>
                                    Â© 2024
         Sify Technologies Limited. All Rights Reserved.</p>
                            </td>
                        </tr>
                </tbody>
                </table>
                <br/>
                </div>
        </body>
    </html>`;
  
      const sendMail = await this.send_mail(toArray, ccArray, subject, html, (attachment = null));
  console.log(sendMail)
      if (sendMail) {
        logger.info(`${req.path} -- ${req.method} -- Success`);
        res.send({ status: "Success" });
      }
    } catch (error) {
      next(error);
    }
  };