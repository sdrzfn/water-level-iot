import { PrismaClient, DeviceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Sedang memproses seeding data...');

  const deviceId = "ALAT_GENANGAN_01";

  const device = await prisma.device.upsert({
    where: { id: deviceId }, // ID yang dikirim oleh ESP8266
    update: {},
    create: {
      id: deviceId,
      serialNumber: 'SN-SRBY-001',
      name: 'Sensor Protokol Basuki Rahmat',
      status: DeviceStatus.ACTIVE,
      hardwareVersion: 'ESP8266-V3-SIM800L',
      
      profile: {
        create: {
          owner: 'Dinas PU Surabaya',
          description: 'Alat monitoring genangan air titik protokol Surabaya Pusat',
          phoneNumber: '081234567890', // Nomor SIM800L
        }
      },

      location: {
        create: {
          latitude: -7.2622, // Contoh koordinat Surabaya
          longitude: 112.7392,
          alamat: 'Jl. Basuki Rahmat No.10, Tegalsari',
          kecamatan: 'Tegalsari',
          tanda: 'Dekat Tunjungan Plaza'
        }
      }
    },
  });

  console.log({ device });
  console.log('Seeding selesai! Alat sekarang siap mengirim data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });