import { toPng, toBlob } from 'html-to-image';

const getCaptureOptions = (element: HTMLElement, pixelRatio = 3) => {
  // Đưa thanh cuộn về 0 để tránh bị lệch khung hình khi chụp
  if (element.parentElement) {
    element.parentElement.scrollLeft = 0;
  }
  element.scrollLeft = 0;

  let contentWidth = Math.max(element.scrollWidth, element.offsetWidth, element.clientWidth);

  // Đo đạc chính xác chiều rộng thực tế của tất cả các bảng và hàng bên trong
  const tables = element.querySelectorAll('table');
  tables.forEach((table) => {
    if (table instanceof HTMLElement) {
      contentWidth = Math.max(contentWidth, table.scrollWidth + 100, table.offsetWidth + 100);

      // Quét từng hàng để tính tổng chiều rộng của tất cả các cột thực tế
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        let rowWidth = 0;
        const cells = row.children;
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (cell instanceof HTMLElement) {
            if (
              cell.classList.contains('print:hidden') ||
              cell.classList.contains('screenshot-exclude')
            ) {
              continue;
            }
            const cellRect = cell.getBoundingClientRect();
            const cellW = Math.max(cell.scrollWidth, cell.offsetWidth, Math.ceil(cellRect.width));
            rowWidth += cellW;
          }
        }
        if (rowWidth > 0) {
          contentWidth = Math.max(contentWidth, rowWidth + 140);
        }
      });
    }
  });

  // Đảm bảo tối thiểu 1200px kèm khoảng đệm an toàn để toàn bộ các cột báo cáo tài chính hiển thị trọn vẹn
  const fullWidth = Math.max(contentWidth, 1200);
  const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, element.clientHeight) + 35;

  return {
    quality: 1.0,
    pixelRatio, // Độ phân giải Ultra HD nét gấp 2.5 - 3 lần
    backgroundColor: '#ffffff',
    cacheBust: true,
    width: fullWidth,
    height: fullHeight,
    style: {
      overflow: 'visible',
      maxWidth: 'none',
      width: `${fullWidth}px`,
      minWidth: `${fullWidth}px`,
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
    const options = getCaptureOptions(element, 3);
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
    const options = getCaptureOptions(element, 2.5);
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
    const options = getCaptureOptions(element, pixelRatio);
    return await toBlob(element, options);
  } catch (error) {
    console.error('Lỗi chụp blob phần tử:', error);
    return null;
  }
}

