const domain = require('../lib');
const { mvtk } = require('@movieticket/reserve-api-abstract-client');
const fs = require('fs');

async function main() {
    const specifications = [];
    Object.keys(domain.factory.videoFormatType).forEach((key) => {
        const videoFormat = domain.factory.videoFormatType[key];
        mvtk.util.constants.TICKET_TYPE.forEach((ticketType) => {
            specifications.push({
                "typeOf": domain.factory.priceSpecificationType.MovieTicketTypeChargeSpecification,
                "appliesToVideoFormat": videoFormat,
                "appliesToMovieTicketType": ticketType.code,
                "price": 300,
                "priceCurrency": domain.factory.priceCurrency.JPY,
                "valueAddedTaxIncluded": true
            });
        });
    });
    console.log(specifications);
    fs.writeFileSync(`${__dirname}/specifications.json`, JSON.stringify(specifications, null, '    '));
}

main().then(console.log).catch(console.error);
