import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Purchase } from "@/lib/instantdb";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#111827",
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#374151",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingVertical: 3,
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
  codeSection: {
    textAlign: "center",
    marginVertical: 20,
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  codeLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    letterSpacing: 1,
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
    fontSize: 16,
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
  paymentMethod: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
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

interface VoucherTemplateProps {
  purchase: Purchase;
  guestName?: string;
  guestEmail?: string;
  companyName?: string;
  companyAddress?: string;
  paymentMethod?: string;
}

export const VoucherTemplate: React.FC<VoucherTemplateProps> = ({
  purchase,
  guestName = "Walk-in Guest",
  guestEmail = "",
  companyName = "CafeOS",
  companyAddress = "",
  paymentMethod = "Cash",
}) => (
  <Document>
    <Page size="A5" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.subtitle}>{companyAddress}</Text>
      </View>

      <Text style={styles.title}>Service Voucher</Text>

      {/* Guest Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Guest Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{guestName}</Text>
        </View>
        {guestEmail && (
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{guestEmail}</Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Service Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{purchase.serviceName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{purchase.serviceType}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>
            {format(new Date(purchase.createdAt), "MMMM d, yyyy h:mm a")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.paymentMethod}>{paymentMethod.toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.status}>{purchase.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Access Code */}
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>ACCESS CODE (Use for Check-in)</Text>
        <Text style={styles.codeValue}>{purchase.qrCode}</Text>
      </View>

      {/* Total */}
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Amount Paid</Text>
        <Text style={styles.totalValue}>
          ₦{purchase.amount.toLocaleString()}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Reference</Text>
        <Text style={styles.value}>{purchase.paymentReference}</Text>
      </View>

      <View style={styles.footer}>
        <Text>Present this voucher or the access code at the front desk.</Text>
        <Text style={{ marginTop: 4 }}>
          {companyName} · {companyAddress}
        </Text>
      </View>
    </Page>
  </Document>
);
