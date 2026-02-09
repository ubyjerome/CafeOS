export { ReceiptTemplate } from './ReceiptTemplate';
export { VoucherTemplate } from './VoucherTemplate';
export { TransactionTemplate } from './TransactionTemplate';

import type { Purchase } from '@/lib/instantdb';

/**
 * Generate and download a PDF receipt/voucher/transaction
 */
export const downloadPdf = async (
  templateType: 'receipt' | 'voucher' | 'transaction',
  purchase: Purchase,
  options?: {
    guestName?: string;
    guestEmail?: string;
    companyName?: string;
    companyAddress?: string;
    paymentMethod?: string;
  }
) => {
  const { pdf } = await import('@react-pdf/renderer');
  const React = await import('react');

  let element: React.ReactElement;

  if (templateType === 'receipt') {
    const { ReceiptTemplate } = await import('./ReceiptTemplate');
    element = React.createElement(ReceiptTemplate, {
      purchase,
      companyName: options?.companyName,
      companyAddress: options?.companyAddress,
    });
  } else if (templateType === 'voucher') {
    const { VoucherTemplate } = await import('./VoucherTemplate');
    element = React.createElement(VoucherTemplate, {
      purchase,
      guestName: options?.guestName,
      guestEmail: options?.guestEmail,
      companyName: options?.companyName,
      companyAddress: options?.companyAddress,
      paymentMethod: options?.paymentMethod,
    });
  } else {
    const { TransactionTemplate } = await import('./TransactionTemplate');
    element = React.createElement(TransactionTemplate, {
      purchase,
      guestName: options?.guestName,
      guestEmail: options?.guestEmail,
      companyName: options?.companyName,
      companyAddress: options?.companyAddress,
      paymentMethod: options?.paymentMethod,
    });
  }

  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${templateType}-${purchase.paymentReference}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
