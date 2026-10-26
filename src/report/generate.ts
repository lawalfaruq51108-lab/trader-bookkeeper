import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { MonthReportData } from '../domain/types';
import type { Profile } from '../db/profile';
import { buildReportHtml } from './template';

export async function generateReportPdf(
  data: MonthReportData,
  profile: Profile | null,
  isDemo = false
): Promise<string> {
  const html = buildReportHtml(data, profile, isDemo);
  const result = await Print.printToFileAsync({ html });
  if (!result.uri) {
    throw new Error('The report PDF could not be created.');
  }
  return result.uri;
}

export async function shareReportPdf(
  data: MonthReportData,
  profile: Profile | null,
  isDemo = false
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('PDF sharing is not available on this device.');
  }
  const uri = await generateReportPdf(data, profile, isDemo);
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Share ${data.month} business report`,
  });
}
