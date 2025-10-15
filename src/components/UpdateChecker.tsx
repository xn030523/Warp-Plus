import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const checkForUpdates = async () => {
    if (checking || downloading) return;
    
    setChecking(true);
    try {
      const update = await check();
      
      if (update?.available) {
        setUpdateAvailable(true);
        
        // 询问用户是否更新
        const shouldUpdate = confirm(
          `发现新版本 ${update.version}！\n\n是否立即下载并安装？`
        );
        
        if (shouldUpdate) {
          setDownloading(true);
          
          // 下载并安装更新
          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                console.log('开始下载更新...');
                break;
              case 'Progress':
                console.log(`下载进度: ${event.data.chunkLength} bytes`);
                break;
              case 'Finished':
                console.log('下载完成！');
                break;
            }
          });
          
          // 重启应用以应用更新
          await relaunch();
        }
      } else {
        alert('当前已是最新版本！');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      alert('检查更新失败，请稍后重试');
    } finally {
      setChecking(false);
      setDownloading(false);
    }
  };

  // 启动时自动检查更新
  useEffect(() => {
    const autoCheck = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error('自动检查更新失败:', error);
      }
    };

    autoCheck();
  }, []);

  return (
    <button
      className={`update-btn ${updateAvailable ? 'has-update' : ''}`}
      onClick={checkForUpdates}
      disabled={checking || downloading}
    >
      {downloading ? (
        <>⏳ 更新中...</>
      ) : checking ? (
        <>🔄 检查中...</>
      ) : updateAvailable ? (
        <>🎉 有新版本</>
      ) : (
        <>🔍 检查更新</>
      )}
    </button>
  );
}

export default UpdateChecker;
