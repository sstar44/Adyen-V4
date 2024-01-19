const express = require('express');
const jose = require('node-jose');
const router = express.Router();

// Function to convert a hex string to a buffer
function hexToBuffer(hexString) {
    if (hexString.length % 2 !== 0) {
        hexString = "0" + hexString;
    }
    return Buffer.from(hexString, 'hex');
}

// Converts a buffer to a URL-safe Base64 encoded string
function base64UrlEncode(buffer) {
    return buffer.toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

// Parses an RSA key string into a format usable by node-jose
async function parseKey(keyString) {
    const [exponentHex, modulusHex] = keyString.split('|');
    const exponentBuffer = hexToBuffer(exponentHex);
    const modulusBuffer = hexToBuffer(modulusHex);

    return jose.JWK.asKey({
        kty: 'RSA',
        kid: 'asf-key',
        e: base64UrlEncode(exponentBuffer),
        n: base64UrlEncode(modulusBuffer)
    });
}

// Encrypts card data using node-jose
async function encrypt(pubKey, fieldName, value, generationTime) {
    const formattedGenerationTime = generationTime.toISOString().split('.')[0] + 'Z';
    const data = { generationtime: formattedGenerationTime };
    data[fieldName] = value;

    return jose.JWE.createEncrypt({
        format: 'compact',
        contentAlg: 'A256CBC-HS512',
        fields: {
            alg: 'RSA-OAEP',
            enc: 'A256CBC-HS512',
            version: '1'
        }
    }, { key: pubKey, reference: false })
    .update(JSON.stringify(data))
    .final();
}

router.post('/', async (req, res) => {
    // Validation function
    function validate(stringv) {
        return !!stringv;
    }

    const { key, cc } = req.body;
    if (!validate(cc) || !validate(key)) {
        return res.json({ 'success': false, 'msg': 'Invalid input' });
    }

    try {
        const pubKey = await parseKey(key);
        const [cardNumber, expiryMonth, expiryYear, cvc] = cc.split("|");
        const generationTime = new Date();

        const encryptedData = await Promise.all([
            encrypt(pubKey, 'number', cardNumber, generationTime),
            encrypt(pubKey, 'expiryMonth', expiryMonth, generationTime),
            encrypt(pubKey, 'expiryYear', expiryYear, generationTime),
            encrypt(pubKey, 'cvc', cvc, generationTime)
        ]);

        res.json({
            "success": true,
            "msg": "Data encrypted",
            "encryptedCardNumber": encryptedData[0],
            "encryptedExpiryMonth": encryptedData[1],
            "encryptedExpiryYear": encryptedData[2],
            "encryptedSecurityCode": encryptedData[3]
        });
    } catch (error) {
        console.error('Encryption error:', error.message);
        res.status(500).json({ success: false, msg: 'Encryption failed' });
    }
});

module.exports = router;

