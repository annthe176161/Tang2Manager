import { toPng, toBlob } from 'html-to-image';

export async function downloadScheduleImage(element: HTMLElement, filename = 'Lich_Lam_Nha_Hang_UltraHD.png') {
  try {
    // Ultra HD 3x pixelRatio for razor-sharp text and borders (resolution > 3000px wide)
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return true;
  } catch (error) {
    console.error('Lỗi chụp ảnh lịch:', error);
    throw error;
  }
}

export async function copyScheduleImageToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    // Ultra HD 3x for clipboard
    const blob = await toBlob(element, {
      quality: 1.0,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    if (!blob) throw new Error('Không thể tạo blob ảnh');

    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      return true;
    } else {
      throw new Error('Trình duyệt không hỗ trợ sao chép ảnh vào clipboard.');
    }
  } catch (error) {
    console.error('Lỗi copy ảnh clipboard:', error);
    throw error;
  }
}
