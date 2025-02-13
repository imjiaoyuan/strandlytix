let viewer;
let isSpinning = false;
let renderTimeout;
let isDragging = false; // 添加拖拽状态标记

// 在文件开头添加颜色映射
const chainColors = {
    'A': '#ff0000', // 红色
    'B': '#00ff00', // 绿色
    'C': '#0000ff', // 蓝色
    'D': '#ffff00', // 黄色
    'E': '#ff00ff', // 品红
    'F': '#00ffff', // 青色
    'G': '#ffa500', // 橙色
    'H': '#800080', // 紫色
    'I': '#008000', // 深绿
    'J': '#800000'  // 褐色
};

$(document).ready(function() {
    // 初始化查看器，添加性能相关配置
    viewer = $3Dmol.createViewer($("#viewer"), {
        backgroundColor: "white",
        antialias: true,
        defaultcolors: $3Dmol.rasmolElementColors,
        cameraPosZ: 150,  // 调整相机距离
        rendererConfig: {
            preserveDrawingBuffer: true // 这对导出功能很重要
        }
    });
    
    // 优化的防抖渲染函数
    function debouncedRender() {
        if (renderTimeout) clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            viewer.render();
        }, isDragging ? 0 : 100); // 拖拽时立即渲染，其他情况延迟渲染
    }
    
    // 添加拖拽状态监听
    $("#viewer")
        .on('mousedown touchstart', () => {
            isDragging = true;
        })
        .on('mouseup touchend', () => {
            isDragging = false;
            debouncedRender();
        });
    
    // 文件上传处理
    $("#structure-file").change(function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // 更新文件名显示
        $("#file-name").text(file.name);
        
        // 添加加载提示
        $("#viewer").append('<div class="loading">正在加载结构...</div>');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const format = file.name.toLowerCase().endsWith('.pdb') ? 'pdb' : 'mmcif';
                
                viewer.clear();
                viewer.addModel(content, format);
                // 设置默认样式和颜色
                const style = $("#visualization-style").val();
                const colorScheme = $("#color-scheme").val();
                applyStyle(style, colorScheme);
                viewer.zoomTo();
            } catch (error) {
                console.error("加载结构时出错:", error);
                alert("加载文件失败，请确保文件格式正确");
            } finally {
                $(".loading").remove();
            }
        };
        
        reader.onerror = function() {
            console.error("读取文件失败");
            alert("读取文件失败");
            $(".loading").remove();
        };
        
        reader.readAsText(file);
    });
    
    // 修改样式应用函数中的性能相关参数
    function applyStyle(style, colorScheme) {
        if (!viewer) return;
        
        viewer.setStyle({}, {});
        
        let styleConfig = {};
        
        // 根据颜色方案设置配色
        switch(colorScheme) {
            case 'confidence':
                styleConfig = {
                    colorfunc: function(atom) {
                        const val = atom.b || 0;
                        if (val < 40) return 'blue';
                        if (val < 70) return 'white';
                        return 'red';
                    }
                };
                break;
            case 'rainbow':
                styleConfig = {
                    color: 'spectrum'
                };
                break;
            case 'chain':
                styleConfig = {
                    colorfunc: function(atom) {
                        return chainColors[atom.chain] || '#cccccc';
                    }
                };
                break;
        }
        
        // 应用样式时添加性能优化参数
        switch(style) {
            case 'cartoon':
                viewer.setStyle({}, {
                    cartoon: {
                        ...styleConfig,
                        opacity: 0.9,
                        smoothness: 2,  // 增加平滑度
                        thickness: 0.4   // 减小厚度
                    }
                });
                break;
            case 'stick':
                viewer.setStyle({}, {
                    stick: {
                        ...styleConfig,
                        radius: 0.2,
                        resolution: 12  // 降低分辨率
                    }
                });
                break;
            case 'sphere':
                viewer.setStyle({}, {
                    sphere: {
                        ...styleConfig,
                        radius: 0.8,
                        resolution: 12  // 降低分辨率
                    }
                });
                break;
            case 'line':
                viewer.setStyle({}, {
                    line: {
                        ...styleConfig,
                        linewidth: 1.5  // 减小线宽
                    }
                });
                break;
        }
        
        debouncedRender();
    }
    
    // 样式改变
    $("#visualization-style").change(function() {
        const style = $(this).val();
        const colorScheme = $("#color-scheme").val();
        applyStyle(style, colorScheme);
    });
    
    // 颜色改变
    $("#color-scheme").change(function() {
        const style = $("#visualization-style").val();
        const colorScheme = $(this).val();
        applyStyle(style, colorScheme);
    });
    
    // 重置视图
    $("#reset-view").click(function() {
        viewer.zoomTo();
        debouncedRender();
    });
    
    // 修改SVG导出功能
    $("#export-svg").click(function() {
        try {
            const currentFileName = $("#file-name").text().split('.')[0] || 'structure';
            const style = $("#visualization-style").val();
            const colorScheme = $("#color-scheme").val();
            const fileName = `${currentFileName}_${style}_${colorScheme}.svg`;

            // 确保在导出前完成渲染
            viewer.render();
            
            // 获取canvas元素
            const canvas = viewer.getCanvas();
            if (!canvas) {
                throw new Error("无法获取画布数据");
            }

            // 创建SVG
            const width = canvas.width;
            const height = canvas.height;
            const imageData = canvas.toDataURL('image/png');
            
            const svgData = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
                    width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                    <image width="${width}" height="${height}" 
                        xlink:href="${imageData}"/>
                </svg>`;

            // 创建Blob对象
            const blob = new Blob([svgData], {
                type: 'image/svg+xml;charset=utf-8'
            });

            // 使用URL.createObjectURL创建下载链接
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = fileName;

            // 触发下载
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // 清理URL
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error("导出SVG时出错:", error);
            alert("导出SVG失败: " + error.message);
        }
    });

    // 添加PNG导出功能
    $("#export-png").click(function() {
        try {
            const currentFileName = $("#file-name").text().split('.')[0] || 'structure';
            const style = $("#visualization-style").val();
            const colorScheme = $("#color-scheme").val();
            const fileName = `${currentFileName}_${style}_${colorScheme}.png`;

            // 确保在导出前完成渲染
            viewer.render();
            
            // 获取PNG数据
            let imgData = viewer.pngURI();
            if (!imgData) {
                throw new Error("无法生成PNG数据");
            }

            // 创建下载链接
            const downloadLink = document.createElement('a');
            downloadLink.href = imgData;
            downloadLink.download = fileName;

            // 触发下载
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

        } catch (error) {
            console.error("导出PNG时出错:", error);
            alert("导出PNG失败: " + error.message);
        }
    });

    // 优化旋转渲染
    let spinInterval;
    $("#spin").click(function() {
        isSpinning = !isSpinning;
        viewer.spin(isSpinning);
        
        if (isSpinning) {
            spinInterval = setInterval(() => {
                if (!isDragging) {  // 只在非拖拽状态下渲染
                    viewer.render();
                }
            }, 50);
        } else {
            clearInterval(spinInterval);
        }
        
        $(this).html(
            isSpinning ? 
            '<span class="btn-icon">⏹</span>停止旋转' : 
            '<span class="btn-icon">↻</span>旋转'
        );
    });
}); 