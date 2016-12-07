'use strict';

const BOT_BUILDER = require('claudia-bot-builder');
const SLACK_TEMPLATE = BOT_BUILDER.slackTemplate;
const SLACK_DELAYED_REPLY = BOT_BUILDER.slackDelayedReply;
const aws = require('aws-sdk');
const lambda = new aws.Lambda();

const REF_TAG_CLIFF = "cliffchung-20";
const REF_TAG_RICHARD = "tridium-20";
const SLACK_USERID_CLIFF="U0EE01SJF"
const SLACK_USERID_RICHARD="U0EE2NT6K"
const COMMAND = "/amz";
const AMZN_LINK_REGEX = new RegExp(".*(\s)?(http(s)?:\/\/(.*amazon\..*\/|.*amazon\..*\/gp\/product\/.*|.*amazon\..*\/.*\/dp\/.*|.*amazon\..*\/dp\/.*|.*amazon\..*\/o\/ASIN\/.*|.*amazon\..*\/gp\/offer-listing\/.*|.*amazon\..*\/.*\/ASIN\/.*|.*amazon\..*\/gp\/product\/images\/.*|.*amazon\..*\/gp\/aw\/d\/.*|.*amazon\..*\/s\/.*|.*amazon\..*\/gp\/redirect.html.*|www\.amzn\.com\/.*|amzn\.com\/.*)B[0-9a-zA-Z]{9}\/?)");
const USAGE = "Usage: " + COMMAND + " [Amazon product link] [Referral tag to use (Optional - c || r)]";
const REF_TAG_PREPEND = "?tag=";
const VERIFICATION_TOKEN = "KhEwMI5xJs1Y9kKIfn63TrxZ";

var usingCliffsRefTag = true;

function getRefTagToUse(message) {
    var splitString = message.text.split(" ");

    var refTagToUse = "";

    if (splitString.length > 1) {
        var refTagArgument = splitString[1].toLowerCase();

        if (refTagArgument === "c") {
            refTagToUse = REF_TAG_CLIFF;
        } else if (refTagArgument === "r") {
            refTagToUse = REF_TAG_RICHARD;
        }
        // otherwise continue to default behavior
    }

    if (refTagToUse.trim().length === 0) {
        if (message.sender === SLACK_USERID_CLIFF) {
            refTagToUse = REF_TAG_CLIFF;
        } else if (message.sender === SLACK_USERID_RICHARD) {
            refTagToUse = REF_TAG_RICHARD;
        } else {
            refTagToUse = usingCliffsRefTag ? REF_TAG_CLIFF : REF_TAG_RICHARD;
        }
        usingCliffsRefTag = !usingCliffsRefTag;
    }

    return refTagToUse;
}

const api = BOT_BUILDER((message, apiRequest) => {
    // but first, let's make sure the token matches!
    if (message.originalRequest.token !== VERIFICATION_TOKEN) {
        return;
    }

    // if no text was supplied, treat it as a help command
    if (message.text === "" || message.text === "help") {
        return USAGE;
    }

    if (AMZN_LINK_REGEX.test(message.text)) {
        return new Promise((resolve, reject) => {
            lambda.invoke({
                FunctionName: apiRequest.lambdaContext.functionName,
                InvocationType: 'Event',
                Payload: JSON.stringify({
                    slackEvent: message
                }),
                Qualifier: apiRequest.lambdaContext.functionVersion
            }, (err, done) => {
                if (err) console.log(err, err.stack);

                resolve();
            });
        })
        .then(() => {
            return new SLACK_TEMPLATE("")
                .replaceOriginal(true)
                .addAttachment()
                .addPretext("Creating link...")
                .get();
        })
        .catch(() => {
            return "Could not create Amazon link :("
        });
    } else {
        return USAGE;
    }
});


api.intercept((event) => {
    if (!event.slackEvent) { // if this is a normal web request, let it run
        return event;
    }

    const message = event.slackEvent;

    // get the 2nd match group
    var strippedLink = AMZN_LINK_REGEX.exec(message.text)[2];

    if (strippedLink.charAt(strippedLink.length - 1) != '\/') {
        strippedLink += "\/";
    }

    var refTagToUse = getRefTagToUse(message);
    strippedLink = strippedLink + REF_TAG_PREPEND + refTagToUse;

    var returnMessage = new SLACK_TEMPLATE("")
        .channelMessage(true) // announce it to the channel
        .addAttachment()
        .addText(strippedLink)
        .addPretext(
                message.originalRequest.user_name
                + " requested a link")
        .addColor("#7CD197")
        .get();
    return SLACK_DELAYED_REPLY(message, returnMessage)
        .then(() => false); // prevent normal execution
});

module.exports = api;
