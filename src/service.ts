/**
 * service module
 */
import * as AggregationService from './service/aggregation';
import * as EventService from './service/event';
import * as IAMService from './service/iam';
import * as NotificationService from './service/notification';
import * as OfferService from './service/offer';
import * as ProjectService from './service/project';
import * as ReportService from './service/report';
import * as TaskService from './service/task';
import * as TransactionService from './service/transaction';
import * as WebhookService from './service/webhook';

export import aggregation = AggregationService;
export import event = EventService;
export import iam = IAMService;
export import notification = NotificationService;
export import offer = OfferService;
export import project = ProjectService;
export import report = ReportService;
export import task = TaskService;
export import transaction = TransactionService;
export import webhook = WebhookService;
