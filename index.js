
const MD5 = require('crypto-js/md5');
const express = require('express');
const app = express();
const Chance = require('chance')

const port = process.env.PHANTAUTH_CHANCE_PORT || 4000;

var globalChance = new Chance();

function parseName(req) {
    return newName(req.params.name);
}

function newName(input) {
    function normalize(input) {
        var idx = input ? input.indexOf(';') : -1
    
        var flags = idx < 0 ? null : idx + 1 > input.length ? null : input.substring(idx + 1);
        var basePart = idx < 0 ? input : idx == 0 ? null : input.substring(0, idx);
        var base = (basePart ? basePart : globalChance.first() + globalChance.integer({min: 2, max: 99})).toLowerCase();
        var subject = base + ((flags != null && flags != "") ? (";" + flags) : "");
    
        return {"subject": subject, "base": base, "flags": flags}
    }
    
    function base2name(base) {
        var idx = base.indexOf('@');
    
        var mailbox = idx < 0 ? base : idx == 0 ? null : base.slice(0,idx);
        idx = mailbox.indexOf('+');
        var mailtag = idx < 0 ? mailbox : mailbox.slice(idx + 1);
        return  mailtag.split('.').map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(' ');
    }

    var name = normalize(input);
    name.name = base2name(name.base);
    var chance = new Chance(name.base);

    name.hash = MD5(name.base).toString();
    name.chance = chance;

    return name;
}

function newUser(name) {
    var chance = name.chance;

    var first = chance.first();
    var last = chance.last();
    var street = chance.address()
    var city = chance.city();
    var zip = chance.zip();
    var tz = chance.timezone().utc;
    if ( tz ) {
        tz = tz[0];
    }
    return {
        "sub": name.subject,
        "name": first + ' ' + last,
        "given_name": first,
        "family_name": last,
        "nickname": first,
        "preferred_username": (first.charAt(0) + last).toLowerCase(),
        "gender": chance.gender().toLowerCase(),
        "birthdate": chance.birthday().toISOString().slice(0,10),
        "zoneinfo": tz,
        "email": chance.email(),
        "email_verified": chance.bool(),
        "phone_number": chance.phone(),
        "phone_number_verified": chance.bool(),
        "password": chance.hash({length: 8}),
        "picture":  'https://api.adorable.io/avatars/256/' + name.hash + '.png',
        "address": {
            "postal_code": zip,
            "locality": city,
            "country": chance.country({full: true}),
            "region": chance.state(),
            "street_address": street,
            "formatted": street + ' ' + city + ' ' + zip
        }
    };
}

function newTeam(name) {
    return {
        "sub": name.subject,
        "name": name.name,
        "logo": `https://www.gravatar.com/avatar/${name.hash}?s=256&d=identicon`,
        "members": Array(8).fill().map(() => newUser(newName(name.chance.first() + name.chance.integer({min: 2, max: 99}))))
    };
}

app.get("/api/user/:name?", (req, res) => {
    res.json(newUser(parseName(req)));
});

app.get("/api/team/:name?", (req, res) => {
    res.json(newTeam(parseName(req)));
});

app.use(express.static('.'))

app.listen(port, () => console.log(`Listening on port ${port}!`))
