import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UploadBillDto } from './upload-bill.dto';

const base = {
  businessId: '11111111-1111-4111-8111-111111111111',
  amount: 250,
  billDate: '2026-10-10',
  billImage: 'x/y.png',
};
const errors = async (extra: Record<string, unknown>) =>
  (await validate(plainToInstance(UploadBillDto, { ...base, ...extra }))).map((e) => e.property);

describe('UploadBillDto purchase method', () => {
  it('requires how the customer bought', async () => {
    expect(await errors({})).toContain('orderChannel');
  });

  it('in-store and takeaway need a payment mode', async () => {
    expect(await errors({ orderChannel: 'IN_STORE' })).toContain('paymentMode');
    expect(await errors({ orderChannel: 'TAKEAWAY', paymentMode: 'WALLET' })).toContain(
      'paymentMode',
    );
    for (const pm of ['CASH', 'UPI', 'DEBIT_CARD', 'CREDIT_CARD']) {
      expect(await errors({ orderChannel: 'IN_STORE', paymentMode: pm })).toEqual([]);
    }
  });

  it('delivery needs the app, and a name when it is "other"; payment mode is not asked', async () => {
    expect(await errors({ orderChannel: 'DELIVERY' })).toContain('deliveryPartner');
    expect(await errors({ orderChannel: 'DELIVERY', deliveryPartner: 'SWIGGY' })).toEqual([]);
    expect(await errors({ orderChannel: 'DELIVERY', deliveryPartner: 'OTHER' })).toContain(
      'deliveryPartnerName',
    );
    expect(
      await errors({
        orderChannel: 'DELIVERY',
        deliveryPartner: 'OTHER',
        deliveryPartnerName: 'Dunzo',
      }),
    ).toEqual([]);
  });
});
