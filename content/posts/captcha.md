+++
title = "Serverless captcha for static sites"
tags = ["Web"]
date = "2020-12-15"
tldr = "Can we include a CAPTCHA in statically generated web-sites to hide content from spammers?"
+++

In a recent web-design project we decided that we want to prevent spam and other leakages of information by hiding away that content (e.g. the mail-address) behind a [CAPTCHA](https://en.wikipedia.org/wiki/CAPTCHA). Now that web-site up until that point was a completely static site (build with [Hugo](https://gohugo.io/)) even lacking any scripting. As I am a staunch defender of keeping static content static, I wanted to avoid having to administer a server and maybe even porting this simple site to some for of dynamic CMS.

It might not be obvious why using one of the classic CAPTCHAs (hCaptcha, recaptcha) necessitates a server. The CAPTCHA is a little JS widget that will pose the turing-test question to the user and will communicate with the provider (hCaptcha, Google). The provider server-side will check the answer, and send an approve / disapprove message back to the site where we can wait for it with a JS script. Now the hidden content should appear, but this content not be contained in the site code yet, otherwise it could be readout. Therefore we need a _"server"_ that we will send the response token from the CAPTCHA to, then will certify the response with the CAPTCHA provider and only then respond with the hidden content which we at that point can insert into the site.

Because I know nothing about _serverless_ servers and this seemed like the perfect contained λ like function I implemented it with AWS Lambda and Python. This setup has three parts:

1. The lambda function, which takes in a receives a CAPTCHA response token and in case of success returns the hidden content
2. The CAPTCHA widget in the site
3. A script that sends the token from the widget to out λ-function, waits for the answer and replaces the widget with the hidden content

Here is a test for the finished script:

<center class="box">
<i>Here is a little test with one captcha and two little secrets:</i>
<div class="secret-email">
    <div class="h-captcha" data-sitekey="149a0595-ac45-40e7-8587-c4d78364e156" data-callback="onSuccessfullCaptcha"></div>
    ……@morris-frank.dev
</div>

<div class="secret-secret">
    To see the message use the captcha.
</div>
</center>

### The λ-function

The lambda-function is easily implemented in pure Python. The response has to wait for the CAPTCHA provider anyway so the code can be synchronous. Go on AWS Lambda in the console and create a new function in a Python enviroment. Under the code tab copy this code:

```python
import base64
import json
from urllib import parse, request

VERIFY_URL = "https://hcaptcha.com/siteverify"
SECRET_KEY = "0x0000000000000000000000000000000000000000"
SECRETS = {
    "iban": "this-is-the-iban",
    "email": "my-secret-mailaddress@example.org",
}

def gen_response(statusCode, body=None):
    return {
        "statusCode": statusCode,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }

def lambda_handler(event, context):
    body = parse.parse_qs(base64.b64decode(event["body"]).decode("utf-8"))
    if "response" not in body:
        return gen_response(400)

    token = body["response"][0]
    data = parse.urlencode({"secret": SECRET_KEY, "response": token}).encode()
    req = request.Request(VERIFY_URL, data=data)

    with request.urlopen(req) as resp:
        success = json.loads(resp.read().decode("utf8"))["success"]
        if success:
            return gen_response(200, SECRETS)
        else:
            return gen_response(401)
```

We avoid using `requests` to avoid dealing with installing dependencies so therefore we implement the POST request to hcaptcha with the `urllib`. The is is pretty self-explanatory, check for the response token in an incoming event, send it to hcaptcha with the <var>SECRET_KEY</var> and if the response to that is successfull, return the <var>SECRETS</var>.

The only tricky part was, finding that we have to decode `body` of the incoming POST request from base64 and url-encoding manually:

```python
body = parse.parse_qs(base64.b64decode(event["body"]).decode("utf-8"))
```

Not really sure why this is not handled automatically.

To make the lambda-function accessible from the static website you have to create an API in AWS. Go to the API Gateway in the AWS console and create a new API which will give you a public-facing URL.

Under _Route_ create a new POST route (can be just <var>/</var>). Then under _Attach integration_, create a new integration of type Lambda, where you can choose your already saved new lambda-function.

It is a good idea to lock down the public API as much as possible, which you can do under the CORS tab. Here you can restrict the incoming domains (just enter your static site domain) and the request methods (we are only using POST). With that the serverless AWS server part is finished and we work on the static site of things…

### Including the CAPTCHA widget

We add the hcaptcha widget and the JS API anywhere in the site. The site-key you should have generated previously in your hcaptcha account. The `data-callback` attribute is the name of the callback function the hcaptcha script is calling after a successfull test.

```html
<div
  class="h-captcha"
  data-sitekey="10000000-ffff-ffff-ffff-000000000001"
  data-callback="onSuccessfullCaptcha"
></div>
<script src="https://hcaptcha.com/1/api.js" async defer></script>
```

### Processing the CAPTCHA response

Here we keep the callback function as simple as possible, but of course in your use-case that might be more involved:

```javascript
var captcha_lambda_endpoint = "https://RANDOM.YOUR-AWS-REGION.amazonaws.com/";
var replaceSecrets = function (secrets) {
  for (const key in secrets) {
    for (const root of document.getElementsByClassName("secret-" + key)) {
      root.innerHTML = secrets[key];
    }
  }
};
var onSuccessfullCaptcha = function (token) {
  const XHR = new XMLHttpRequest();
  let data = "response=" + encodeURIComponent(token);
  XHR.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let secrets = JSON.parse(this.responseText);
      replaceSecrets(secrets);
    }
  };
  XHR.open("POST", captcha_lambda_endpoint);
  XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  XHR.send(data);
};
```

Again we avoid using any external libraries and send the POST request with vanilla JS. When the request completes and is succesfull (statusCode of 200) we parse the incoming data with JSON and use the extremely simple <var>replaceSecrets</var> function to replace the contents of all hidden secret elements with their corresponding secrets.

And that's it! Now you might wanna make this a tad more complicated, e.g. the state of unlocking the secrets would only temporary so you might wanna set a cookie that you can check with the lambda-function. But for now that's it.

<script src="https://hcaptcha.com/1/api.js" async defer></script>
<script>
var captcha_lambda_endpoint = "https://nxmko95l3k.execute-api.eu-central-1.amazonaws.com/morrisfrank";
var replaceSecrets = function (secrets) {
    for (const key in secrets) {
        for (const root of document.getElementsByClassName("secret-" + key)){
            root.innerHTML = secrets[key];
        }
    }
}
var onSuccessfullCaptcha = function (token) {
    const XHR = new XMLHttpRequest();
    let data = 'response=' + encodeURIComponent(token);
    XHR.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            let secrets = JSON.parse(this.responseText);
            replaceSecrets(secrets);
        }
    };
    XHR.open('POST', captcha_lambda_endpoint);
    XHR.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded' );
    XHR.send( data );
}
</script>
