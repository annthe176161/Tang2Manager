import { toPng, toBlob } from 'html-to-image';

export async function downloadScheduleImage(element: HTMLElement, filename = 'Lich_Lam_Nha_Hang.png') {
  try {
    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: 2, // 2x Retina resolution for super sharp images
      backgroundColor: '#ffffff',
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
    const blob = await toBlob(element, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
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
