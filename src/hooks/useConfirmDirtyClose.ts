import { useCallback } from 'react';
import { Modal } from 'antd';
import type { FormInstance } from 'antd';

export const useConfirmDirtyClose = () => {
  const confirm = useCallback((form: FormInstance, onOk: () => void) => {
    if (form.isFieldsTouched()) {
      Modal.confirm({
        title: 'Discard changes?',
        content: 'You have unsaved changes. Are you sure you want to close?',
        okText: 'Discard',
        okButtonProps: { danger: true },
        cancelText: 'Keep Editing',
        onOk,
      });
    } else {
      onOk();
    }
  }, []);

  return confirm;
};
