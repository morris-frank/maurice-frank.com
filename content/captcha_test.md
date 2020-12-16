+++
title = "λ-Captcha"
+++

<div class="h-captcha" data-sitekey="10000000-ffff-ffff-ffff-000000000001" data-callback="onSuccessfullCaptcha"></div>
<script src="https://hcaptcha.com/1/api.js" async defer></script>
<script>
var captcha_lambda_endpoint = "https://45pbsdz0q9.execute-api.eu-central-1.amazonaws.com/getData";
var onSuccessfullCaptcha = function (args) {
    console.log(args);
}
</script>
