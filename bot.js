const BOT_BUILDER = require('claudia-bot-builder');
const SLACK_TEMPLATE = require('claudia-bot-builder').slackTemplate;

const REF_TAG_CLIFF = "cliffchung-20";
const REF_TAG_RICHARD = "tridium-20";
const SLACK_USERID_CLIFF="U0EE01SJF"
const SLACK_USERID_RICHARD="U0EE2NT6K"
const COMMAND = "/amz";
const AMZN_LINK_REGEX = new RegExp(".*(\s)?(http(s)?:\/\/(.*amazon\..*\/|.*amazon\..*\/gp\/product\/.*|.*amazon\..*\/.*\/dp\/.*|.*amazon\..*\/dp\/.*|.*amazon\..*\/o\/ASIN\/.*|.*amazon\..*\/gp\/offer-listing\/.*|.*amazon\..*\/.*\/ASIN\/.*|.*amazon\..*\/gp\/product\/images\/.*|.*amazon\..*\/gp\/aw\/d\/.*|.*amazon\..*\/s\/.*|.*amazon\..*\/gp\/redirect.html.*|www\.amzn\.com\/.*|amzn\.com\/.*)B[0-9a-zA-Z]{9}\/?)");
const USAGE = "USAGE: " + COMMAND + " [Amazon product link] [Referral tag to use (Optional - c || r) ]";
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

module.exports = BOT_BUILDER(function (message) {
    // but first, let's make sure the token matches!
    if (message.originalRequest.token !== VERIFICATION_TOKEN) {
        return;
    }

    // if no text was supplied, treat it as a help command
    if (message.text === "" || message.text === "help") {
        return USAGE;
    }

    if (AMZN_LINK_REGEX.test(message.text)) {
        // get the 2nd match group
        var strippedLink = AMZN_LINK_REGEX.exec(message.text)[2];

        if (strippedLink.charAt(strippedLink.length - 1) != '\/') {
            strippedLink += "\/";
        }

        var refTagToUse = getRefTagToUse(message);
        strippedLink = strippedLink + REF_TAG_PREPEND + refTagToUse;

        var returnMessage = new SLACK_TEMPLATE(message.originalRequest.user_name 
                + " requested a link: " + strippedLink);
        return returnMessage
            .replaceOriginal(true) // replace the original message with the updated one
            .channelMessage(true) // announce it to the channel
            .get()
    } else {
        return USAGE;
    }
});