import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Purchase } from "@/lib/instantdb";
import { format } from "date-fns";
import { db } from "@/lib/instantdb";
import { CompanySettings } from "@/lib/instantdb";

const { data: settingsData } = db.useQuery({ companySettings: {} });
const companySettings = (settingsData?.companySettings?.[0] ||
  null) as CompanySettings | null;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  companyInfo: {
    textAlign: "right",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 4,
  },
  label: {
    color: "#6b7280",
  },
  value: {
    fontWeight: "bold",
    color: "#111827",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 15,
  },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#111827",
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 15,
  },
  status: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
  },
});

interface ReceiptDocumentProps {
  purchase: Purchase;
  companyName?: string;
  companyAddress?: string;
}

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  purchase,
  companyName = companySettings.name,
  companyAddress = companySettings.address,
}) => (
  <Document>
    <Page size="A5" style={styles.page}>
      <View style={styles.header}>
        <Image src={companySettings.logoUrl} style={styles.logo} />
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text>{companyAddress}</Text>
        </View>
      </View>

      <Text style={styles.title}>Receipt</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Receipt Number</Text>
        <Text style={styles.value}>{purchase.paymentReference}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>
          {format(new Date(purchase.createdAt), "MMMM d, yyyy")}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>
          {format(new Date(purchase.createdAt), "h:mm a")}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Service</Text>
        <Text style={styles.value}>{purchase.serviceName}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{purchase.serviceType}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.status}>{purchase.status.toUpperCase()}</Text>
      </View>

      <View style={styles.total}>
        <Text style={styles.totalLabel}>Amount Paid</Text>
        <Text style={styles.totalValue}>
          ₦{purchase.amount.toLocaleString()}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text>Thank you for your purchase!</Text>
        <Text style={{ marginTop: 4 }}>QR Code: {purchase.qrCode}</Text>
      </View>
    </Page>
  </Document>
);
