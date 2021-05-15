/**
 * index module
 */
import * as mvtkreserveapi from '@movieticket/reserve-api-nodejs-client';
import * as AWS from 'aws-sdk';

import { credentials as cred } from './credentials';
import * as errorHandler from './errorHandler';
import * as factory from './factory';
import * as repository from './repository';
import * as service from './service';

export const credentials = cred;
export import errorHandler = errorHandler;
export import factory = factory;
export import repository = repository;
export import service = service;

export import mvtkreserveapi = mvtkreserveapi;

/**
 * AWS SDK
 */
export import AWS = AWS;
