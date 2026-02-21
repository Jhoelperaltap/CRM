/**
 * PDF download and sharing utilities for the mobile app.
 */

import { downloadAsync, cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getAuthTokens } from './storage';
import { API_BASE_URL } from '../constants/api';

interface DownloadPdfOptions {
  endpoint: string;
  filename: string;
}

/**
 * Download a PDF from the API and share it.
 *
 * @param options - Download options
 * @returns Promise that resolves when sharing is complete
 */
export async function downloadAndSharePdf(options: DownloadPdfOptions): Promise<void> {
  const { endpoint, filename } = options;

  // Get auth tokens for the request
  const { accessToken } = await getAuthTokens();

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // Construct the full URL
  const url = `${API_BASE_URL}${endpoint}`;

  // Create a temporary file path
  const fileUri = `${cacheDirectory}${filename}`;

  try {
    // Download the PDF
    const downloadResult = await downloadAsync(url, fileUri, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download PDF: ${downloadResult.status}`);
    }

    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (isSharingAvailable) {
      // Share the PDF
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PDF',
        UTI: 'com.adobe.pdf', // iOS UTI for PDF
      });
    } else {
      // If sharing isn't available, just alert the user where the file is saved
      Alert.alert(
        'PDF Downloaded',
        `The PDF has been saved to: ${downloadResult.uri}`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}

/**
 * Download an invoice PDF and share it.
 *
 * @param invoiceId - The invoice ID
 * @param invoiceNumber - The invoice number (for filename)
 */
export async function downloadInvoicePdf(invoiceId: string, invoiceNumber: string): Promise<void> {
  const sanitizedNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');

  return downloadAndSharePdf({
    endpoint: `/portal/billing/invoices/${invoiceId}/pdf/`,
    filename: `invoice_${sanitizedNumber}.pdf`,
  });
}

/**
 * Download a quote PDF and share it.
 *
 * @param quoteId - The quote ID
 * @param quoteNumber - The quote number (for filename)
 */
export async function downloadQuotePdf(quoteId: string, quoteNumber: string): Promise<void> {
  const sanitizedNumber = quoteNumber.replace(/[^a-zA-Z0-9-_]/g, '_');

  return downloadAndSharePdf({
    endpoint: `/portal/billing/quotes/${quoteId}/pdf/`,
    filename: `quote_${sanitizedNumber}.pdf`,
  });
}
