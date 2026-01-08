import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Stiluri
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#EAB308", // Yellow-500
    paddingBottom: 15,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "column",
    maxWidth: "60%",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#000000",
  },
  subtitle: {
    fontSize: 12,
    color: "#CA8A04", // Yellow-600
    marginTop: 5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  tourText: {
    fontSize: 10,
    color: "#854D0E",
    marginTop: 2,
    fontFamily: "Helvetica-Oblique",
  },
  metaContainer: {
    alignItems: "flex-end",
  },
  meta: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 2,
  },
  // --- STILURI CARD BILET ---
  ticketContainer: {
    marginBottom: 15,
    padding: 0,
    borderWidth: 1,
    borderColor: "#E5E7EB", // Gray-200
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  leftDecor: {
    width: 8,
    backgroundColor: "#EAB308", // Banda galbena
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    padding: 15,
    flexDirection: "row",
  },
  qrContainer: {
    width: 90,
    height: 90,
    marginRight: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 4,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  categoryName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  seriesBox: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF9C3", // Yellow-100
    borderWidth: 1,
    borderColor: "#EAB308", // Yellow-500
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  seriesText: {
    color: "#854D0E", // Yellow-900
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  price: {
    fontSize: 10,
    color: "#6B7280",
  },
  footerCode: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  codeLabel: {
    fontSize: 8,
    color: "#9CA3AF",
  },
  codeValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#4B5563",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 9,
    color: "#9CA3AF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  footerBold: {
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginTop: 4,
    fontSize: 10,
  },
});

export const TicketDocument = ({
  orderDetails,
  qrCodes,
}: {
  orderDetails: any;
  qrCodes: Record<string, string>;
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Goran Bregovic</Text>
          <Text style={styles.subtitle}>& Bijelo Dugme</Text>
          <Text style={styles.tourText}>Turneu Aniversar "50 Ani - Dozivjeti Stotu"</Text>
        </View>
        <View style={styles.metaContainer}>
          <Text style={styles.meta}>
            ID Comanda: #{orderDetails.id?.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={styles.meta}>Client: {orderDetails.customername}</Text>
          <Text style={styles.meta}>
            Data Achizitiei:{" "}
            {orderDetails.created_at
              ? new Date(orderDetails.created_at).toLocaleDateString("ro-RO")
              : new Date().toLocaleDateString("ro-RO")}
          </Text>
        </View>
      </View>

      {/* Lista Bilete */}
      {orderDetails.items?.map((item: any, idx: number) => (
        <View key={idx} style={styles.ticketContainer}>
          <View style={styles.leftDecor} />

          <View style={styles.contentContainer}>
            {/* QR Code */}
            <View style={styles.qrContainer}>
              {qrCodes[item.unique_qr_id] ? (
                <Image
                  src={qrCodes[item.unique_qr_id]}
                  style={styles.qrImage}
                />
              ) : (
                <Text style={{ fontSize: 8 }}>Loading...</Text>
              )}
            </View>

            {/* Detalii Text */}
            <View style={styles.infoContainer}>
              <View>
                {/* Asigurati-va ca numele categoriei vine fara diacritice din DB sau faceti replace aici */}
                <Text style={styles.categoryName}>{item.category_name}</Text>

                <View style={styles.seriesBox}>
                  <Text style={styles.seriesText}>
                    {item.ticket_display || "PENDING"}
                  </Text>
                </View>

                <Text style={styles.price}>
                  Pret: {item.priceperunit} RON
                </Text>
              </View>

              <View style={styles.footerCode}>
                <Text style={styles.codeLabel}>Valabil pentru 1 persoana</Text>
                <Text style={styles.codeValue}>{item.unique_qr_id}</Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBold}>
          14 FEBRUARIE 2026 • ORA 20:00 • SALA CONSTANTIN JUDE, TIMISOARA
        </Text>
        <Text style={{ marginTop: 4 }}>
          Organizator: Asociatia Centrul Cultural Sarbesc Constantin
        </Text>
        <Text style={{ marginTop: 20, fontSize: 8, color: '#D1D5DB' }}>
          Codul QR este unic si valid pentru o singura scanare la intrare. Nu instrainati biletul.
        </Text>
      </View>
    </Page>
  </Document>
);