# Filecoin Green Simple Dashboard
by [Momcilo Dzunic aka smartbee.eth](https://twitter.com/mdzunic)

This simple dashboard is an weekend project inspired by [Alan Ransil's](https://github.com/redransil) [Filecoin Energy Estimation](https://github.com/redransil/filecoin-energy-estimation) project and [Filecoin Power By Region](https://github.com/redransil/filecoin-power-by-region) project. It aims to enable simple graphical overview over Filecoin Service Providers' power consumption vs. use of Renewable Energy Sources, by interconnecting data available at Filecoin Green API, Filecoin Reputation Systems API, and Energy Web Foundation API.

### Install

    npm install .

### Use

    // build it
    npm run build

    // start webserver (e.g. https://github.com/lwsjs/local-web-server)
    ws -p 2000

    // or, start webserver with SSL certificate
    ws --https --key key.pem --cert cert.pem -p 2000

Open browser

    http://localhost:2000

### ToDo
* Allow graphs comparison for multiple selected Miners
* Integrate CO2 emissions data sources

### License
Licensed under the MIT license.
http://www.opensource.org/licenses/mit-license.php
