/**
 * プロジェクトサービス
 */
import { MongoRepository as AccountTitleRepo } from '../repo/accountTitle';
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/assetTransaction';
import { MongoRepository as CategoryCodeRepo } from '../repo/categoryCode';
import { MongoRepository as CreativeWorkRepo } from '../repo/creativeWork';
import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as MemberRepo } from '../repo/member';
import { MongoRepository as OfferRepo } from '../repo/offer';
import { MongoRepository as OfferCatalogRepo } from '../repo/offerCatalog';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as ProductRepo } from '../repo/product';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as SellerRepo } from '../repo/seller';
import { MongoRepository as ServiceOutputRepo } from '../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../repo/task';

export function deleteProject(params: { id: string }) {
    return async (repos: {
        accountTitle: AccountTitleRepo;
        action: ActionRepo;
        categoryCode: CategoryCodeRepo;
        creativeWork: CreativeWorkRepo;
        event: EventRepo;
        member: MemberRepo;
        offer: OfferRepo;
        offerCatalog: OfferCatalogRepo;
        place: PlaceRepo;
        priceSpecification: PriceSpecificationRepo;
        product: ProductRepo;
        project: ProjectRepo;
        reservation: ReservationRepo;
        seller: SellerRepo;
        serviceOutput: ServiceOutputRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }): Promise<void> => {
        // プロジェクトに所属する全データをリポジトリから削除する
        await repos.reservation.reservationModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.serviceOutput.serviceOutputModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.action.actionModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.task.taskModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.transaction.transactionModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();

        await repos.offer.offerModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.offerCatalog.offerCatalogModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.priceSpecification.priceSpecificationModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.accountTitle.accountTitleModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();

        await repos.event.eventModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.creativeWork.creativeWorkModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.place.placeModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();
        await repos.product.productModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();

        await repos.seller.organizationModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();

        await repos.categoryCode.categoryCodeModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();

        await repos.member.memberModel.deleteMany({
            'project.id': { $exists: true, $eq: params.id }
        })
            .exec();

        await repos.project.projectModel.deleteOne({
            _id: { $exists: true, $eq: params.id }
        })
            .exec();
    };
}
