import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Opțional: Înregistrează un font care suportă diacritice (folosim Helvetica default momentan)
// Font.register({ family: 'Roboto', src: 'https://...' });

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#EAB308', // Yellow-500
    paddingBottom: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold', // Helvetica bold
    textTransform: 'uppercase',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#EAB308',
    marginTop: 5,
  },
  meta: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'right',
  },
  ticketContainer: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrContainer: {
    width: 100,
    height: 100,
    marginRight: 20,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
  },
  badge: {
    backgroundColor: '#FEF08A', // Yellow-200
    color: '#854D0E', // Yellow-900
    padding: 4,
    fontSize: 8,
    alignSelf: 'flex-start',
    borderRadius: 4,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  ticketName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  price: {
    fontSize: 12,
    color: '#444444',
    marginBottom: 10,
  },
  codeLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold', // Simulăm monospace
    color: '#EAB308',
  },
  footer: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#888888',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
  }
});

// Componenta Documentului PDF
export const TicketDocument = ({ orderDetails, qrCodes }: { orderDetails: any, qrCodes: Record<string, string> }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bilet Acces</Text>
          <Text style={styles.subtitle}>Concert Goran Bregović</Text>
        </View>
        <View>
          <Text style={styles.meta}>ID Comanda: {orderDetails.id?.slice(0, 8)}</Text>
          <Text style={styles.meta}>Data: {new Date(orderDetails.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Lista Bilete */}
      {orderDetails.items?.map((item: any, idx: number) => (
        <View key={idx} style={styles.ticketContainer}>
          {/* QR Code (Imagine generată anterior) */}
          <View style={styles.qrContainer}>
            {qrCodes[item.unique_qr_id] && (
              <Image src={qrCodes[item.unique_qr_id]} style={styles.qrImage} />
            )}
          </View>

          {/* Detalii Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.badge}>
                {item.category_code === 'gold' ? 'VIP GOLD' : item.category_code}
            </Text>
            <Text style={styles.ticketName}>{item.category_name}</Text>
            <Text style={styles.price}>Pret: {item.priceperunit} RON</Text>
            
            <View style={{ marginTop: 5, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 5 }}>
                <Text style={styles.codeLabel}>Cod Unic Identificare:</Text>
                <Text style={styles.codeValue}>{item.unique_qr_id}</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Va rugam sa prezentati acest document (imprimat sau pe telefon) la intrare.</Text>
        <Text>Biletele sunt nominale si netransmisibile.</Text>
      </View>

    </Page>
  </Document>
);