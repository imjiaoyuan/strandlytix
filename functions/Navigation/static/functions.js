// 搜索和筛选功能
$(document).ready(function() {
    const searchInput = $("#search-input");
    const filterOptions = $(".filter-options input");

    // 搜索功能
    searchInput.on("input", filterDatabases);
    
    // 分类筛选
    filterOptions.on("change", filterDatabases);

    function filterDatabases() {
        const searchText = searchInput.val().toLowerCase();
        const selectedCategories = [];
        
        filterOptions.each(function() {
            if ($(this).prop("checked")) {
                selectedCategories.push($(this).val());
            }
        });

        $(".database-category").each(function() {
            const category = $(this);
            const categoryType = category.data("type");
            
            // 检查分类
            const categoryVisible = selectedCategories.includes(categoryType);
            
            if (categoryVisible) {
                let hasVisibleItems = false;
                
                // 搜索匹配
                category.find(".database-item").each(function() {
                    const item = $(this);
                    const text = item.text().toLowerCase();
                    const visible = text.includes(searchText);
                    item.toggle(visible);
                    if (visible) hasVisibleItems = true;
                });
                
                category.toggle(hasVisibleItems);
            } else {
                category.hide();
            }
        });
    }
}); 