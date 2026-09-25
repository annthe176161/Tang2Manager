import { toPng, toBlob } from 'html-to-image';

const getCaptureOptions = (element: HTMLElement) => {
  const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, element.clientWidth);
  const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, element.clientHeight);

  return {
    quality: 1.0,
    pixelRatio: 3, // Ultra HD 3x resolution for razor-sharp text and borders (>3000px wide)
    backgroundColor: '#ffffff',
    cacheBust: true,
    width: fullWidth,
    height: fullHeight,
    style: {
      overflow: 'visible',
      maxWidth: 'none',
      width: `${fullWidth}px`,
    },
    filter: (node: Node) => {
      if (node instanceof HTMLElement) {
        if (
          node.classList.contains('print:hidden') ||
          node.classList.contains('screenshot-exclude')
        ) {
          return false;
        }
      }
      return true;
    },
  };
};

export async function downloadScheduleImage(element: HTMLElement, filename = 'Bang_Bieu_Nha_Hang_UltraHD.png') {
  try {
    const options = getCaptureOptions(element);
    const dataUrl = await toPng(element, options);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return true;
  } catch (error) {
    console.error('Lỗi tải ảnh Ultra HD:', error);
    throw error;
  }
}

export async function copyScheduleImageToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const options = getCaptureOptions(element);
    const blob = await toBlob(element, options);

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

export async function captureElementToBlob(element: HTMLElement, pixelRatio = 2.5): Promise<Blob | null> {
  try {
    const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, element.clientWidth);
    const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, element.clientHeight);
    return await toBlob(element, {
      quality: 0.95,
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      width: fullWidth,
      height: fullHeight,
      style: {
        overflow: 'visible',
        maxWidth: 'none',
        width: `${fullWidth}px`,
      },
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          if (
            node.classList.contains('print:hidden') ||
            node.classList.contains('screenshot-exclude')
          ) {
            return false;
          }
        }
        return true;
      },
    });
  } catch (error) {
    console.error('Lỗi chụp blob phần tử:', error);
    return null;
  }
}

