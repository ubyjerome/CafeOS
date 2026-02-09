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
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 9,
    color: "#6b7280",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#111827",
  },
  section: {
    marginBottom: 15,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusConsumed: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  statusPending: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
});

interface TransactionTemplateProps {
  purchase: Purchase;
  guestName?: string;
  guestEmail?: string;
  companyName?: string;
  companyAddress?: string;
  paymentMethod?: string;
}

export const TransactionTemplate: React.FC<TransactionTemplateProps> = ({
  purchase,
  guestName = "Guest",
  guestEmail = "",
  companyName = "CafeOS",
  companyAddress = "",
  paymentMethod,
}) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "paid":
        return { ...styles.status, ...styles.statusPaid };
      case "consumed":
        return { ...styles.status, ...styles.statusConsumed };
      default:
        return { ...styles.status, ...styles.statusPending };
    }
  };

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyAddress}>{companyAddress}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 8, color: "#6b7280", textAlign: "right" }}>
              Transaction Detail
            </Text>
            <Text style={{ fontSize: 8, color: "#6b7280", textAlign: "right" }}>
              {format(new Date(purchase.createdAt), "MMMM d, yyyy")}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Transaction Detail</Text>

        {/* Guest Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
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

        {/* Transaction Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{purchase.paymentReference}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{purchase.serviceName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Service Type</Text>
            <Text style={styles.value}>{purchase.serviceType}</Text>
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
          {paymentMethod && (
            <View style={styles.row}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>{paymentMethod}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={getStatusStyle(purchase.status)}>
              {purchase.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Amount</Text>
          <Text style={styles.totalValue}>
            ₦{purchase.amount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>{companyName}</Text>
          <Text style={{ marginTop: 4 }}>{companyAddress}</Text>
        </View>
      </Page>
    </Document>
  );
};
