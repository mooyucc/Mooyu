# School Insight 迁移到 Xcode 开发指南

本文档说明如何将 School Insight 的完整功能迁移到 Xcode 进行 iOS 原生应用开发。

## 一、功能概览

School Insight 是一个学校查询与对比系统，包含以下核心功能：

### 1.1 前端功能（Web）
- **学校搜索**：支持按学校名称搜索
- **学校列表展示**：卡片式展示搜索结果
- **学校详情查看**：弹窗显示学校详细信息
- **多学校对比**：
  - 基础对比（基本信息、学段、课程等）
  - AI 评估对比（量化评分对比）
- **AI 辅助功能**：
  - 自动补充学校缺失信息
  - 智能搜索可能的学校名称
  - AI 评分评估

### 1.2 后端 API
- `GET /api/schools` - 获取学校列表（支持搜索）
- `GET /api/schools/:id` - 获取单个学校详情
- `POST /api/schools/create-from-name` - 根据名称创建学校
- `POST /api/schools/compare` - 基础对比
- `POST /api/schools/compare-scoring` - AI 评分对比

## 二、技术架构分析

### 2.1 前端技术栈
- **HTML/CSS/JavaScript**：纯前端实现
- **样式**：自定义 CSS，响应式设计
- **状态管理**：原生 JavaScript 变量和 Map/Set
- **API 调用**：Fetch API

### 2.2 后端技术栈
- **Node.js + Express**：RESTful API 服务器
- **MongoDB + Mongoose**：数据库和 ODM
- **AI 集成**：Deepseek API（用于学校信息补充和评分）

### 2.3 数据模型
学校数据包含以下字段：
- 基本信息：序号、名称、网址、国家、城市、性质、涵盖学段
- 学段设置：幼儿园、小学、初中、高中
- IB 课程：PYP、MYP、DP、CP
- 其他课程：A-Level、AP、加拿大课程、澳大利亚课程、IGCSE、其他课程
- AI 评估字段：总分、各维度得分和说明、最终总结

## 三、迁移到 Xcode 的步骤

### 3.1 创建 iOS 项目

1. **在 Xcode 中创建新项目**
   - 选择 "iOS" > "App"
   - 使用 SwiftUI 或 UIKit（推荐 SwiftUI）
   - 项目名称：SchoolInsight

2. **项目结构建议**
   ```
   SchoolInsight/
   ├── Models/
   │   ├── School.swift
   │   └── ScoringData.swift
   ├── Views/
   │   ├── SearchView.swift
   │   ├── SchoolListView.swift
   │   ├── SchoolDetailView.swift
   │   ├── CompareView.swift
   │   └── ScoringCompareView.swift
   ├── ViewModels/
   │   ├── SchoolViewModel.swift
   │   └── CompareViewModel.swift
   ├── Services/
   │   ├── APIService.swift
   │   └── NetworkManager.swift
   ├── Utilities/
   │   └── Constants.swift
   └── Resources/
       └── Assets.xcassets
   ```

### 3.2 数据模型转换

#### 3.2.1 创建 School 模型（Swift）

```swift
import Foundation

struct School: Codable, Identifiable {
    let id: String
    let sequenceNumber: Int?
    let name: String
    let website: String?
    let country: String?
    let city: String?
    let nature: String?
    let coveredStages: String?
    
    // 学段设置
    let kindergarten: String?
    let primary: String?
    let juniorHigh: String?
    let seniorHigh: String?
    
    // IB课程
    let ibPYP: String?
    let ibMYP: String?
    let ibDP: String?
    let ibCP: String?
    
    // 其他课程
    let aLevel: String?
    let ap: String?
    let canadian: String?
    let australian: String?
    let igcse: String?
    let otherCourses: String?
    
    // AI评估字段
    let ai评估总分: Double?
    let ai评估课程声誉与体系成熟度得分: Double?
    let ai评估课程声誉与体系成熟度说明: String?
    // ... 其他AI评估字段
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case sequenceNumber
        case name
        case website
        case country
        case city
        case nature
        case coveredStages
        case kindergarten
        case primary
        case juniorHigh
        case seniorHigh
        case ibPYP
        case ibMYP
        case ibDP
        case ibCP
        case aLevel
        case ap
        case canadian
        case australian
        case igcse
        case otherCourses
        case ai评估总分 = "AI评估_总分"
        case ai评估课程声誉与体系成熟度得分 = "AI评估_课程声誉与体系成熟度_得分"
        case ai评估课程声誉与体系成熟度说明 = "AI评估_课程声誉与体系成熟度_说明"
        // ... 其他字段映射
    }
}
```

#### 3.2.2 创建 API 响应模型

```swift
struct SchoolsResponse: Codable {
    let schools: [School]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
    let possibleSchoolNames: [String]?
}

struct CompareResponse: Codable {
    let schools: [School]
}

struct ScoringResponse: Codable {
    let schools: [School]
    let scoring: ScoringData
}

struct ScoringData: Codable {
    let comparisonTable: [ComparisonRow]
    let totalScores: [String: Double]
    let summary: [String: SchoolSummary]
}

struct ComparisonRow: Codable {
    let dimension: String
    let indicator: String
    let weight: Int
    let scores: [String: Double]
    let explanations: [String: String]
}

struct SchoolSummary: Codable {
    let totalScore: Double
    let strengths: String?
    let characteristics: String?
    let suitableFor: String?
}
```

### 3.3 API 服务层实现

#### 3.3.1 创建 APIService

```swift
import Foundation

class APIService {
    static let shared = APIService()
    
    private let baseURL = "https://mooyu.cc/api" // 或你的服务器地址
    
    private init() {}
    
    // MARK: - 获取学校列表
    func searchSchools(query: String, page: Int = 1, limit: Int = 20) async throws -> SchoolsResponse {
        var components = URLComponents(string: "\(baseURL)/schools")!
        components.queryItems = [
            URLQueryItem(name: "search", value: query),
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(SchoolsResponse.self, from: data)
    }
    
    // MARK: - 获取单个学校详情
    func getSchool(id: String) async throws -> School {
        guard let url = URL(string: "\(baseURL)/schools/\(id)") else {
            throw APIError.invalidURL
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(School.self, from: data)
    }
    
    // MARK: - 创建学校
    func createSchool(name: String) async throws -> School {
        guard let url = URL(string: "\(baseURL)/schools/create-from-name") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["schoolName": name]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(CreateSchoolResponse.self, from: data)
        return response.school
    }
    
    // MARK: - 基础对比
    func compareSchools(ids: [String]) async throws -> CompareResponse {
        guard let url = URL(string: "\(baseURL)/schools/compare") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["schoolIds": ids]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(CompareResponse.self, from: data)
    }
    
    // MARK: - AI评分对比
    func compareScoring(ids: [String]) async throws -> ScoringResponse {
        guard let url = URL(string: "\(baseURL)/schools/compare-scoring") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["schoolIds": ids]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(ScoringResponse.self, from: data)
    }
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case decodingError
}
```

### 3.4 UI 实现（SwiftUI）

#### 3.4.1 搜索视图

```swift
import SwiftUI

struct SearchView: View {
    @StateObject private var viewModel = SchoolViewModel()
    @State private var searchText = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // 搜索框
                HStack {
                    TextField("搜索学校名称...", text: $searchText)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .onSubmit {
                            viewModel.search(query: searchText)
                        }
                    
                    Button("搜索") {
                        viewModel.search(query: searchText)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                
                // 学校列表
                if viewModel.isLoading {
                    ProgressView("AI 评估中，请耐心等候...")
                } else if viewModel.schools.isEmpty {
                    EmptyStateView()
                } else {
                    SchoolListView(schools: viewModel.schools)
                }
            }
            .navigationTitle("School Insight")
        }
    }
}
```

#### 3.4.2 学校列表视图

```swift
struct SchoolListView: View {
    let schools: [School]
    @StateObject private var compareViewModel = CompareViewModel()
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: 20) {
                ForEach(schools) { school in
                    SchoolCard(school: school, isSelected: compareViewModel.isSelected(school))
                        .onTapGesture {
                            // 显示详情
                        }
                }
            }
            .padding()
        }
        .overlay(alignment: .bottom) {
            if compareViewModel.hasSelection {
                CompareBar(viewModel: compareViewModel)
            }
        }
    }
}
```

#### 3.4.3 对比视图

```swift
struct CompareView: View {
    let schools: [School]
    @State private var compareMode: CompareMode = .basic
    @State private var scoringData: ScoringData?
    
    enum CompareMode {
        case basic
        case scoring
    }
    
    var body: some View {
        VStack {
            Picker("对比模式", selection: $compareMode) {
                Text("基础对比").tag(CompareMode.basic)
                Text("AI评估").tag(CompareMode.scoring)
            }
            .pickerStyle(.segmented)
            .padding()
            
            if compareMode == .basic {
                BasicCompareTable(schools: schools)
            } else {
                if let scoring = scoringData {
                    ScoringCompareView(scoring: scoring, schools: schools)
                } else {
                    ProgressView("正在生成AI评估...")
                        .onAppear {
                            loadScoring()
                        }
                }
            }
        }
    }
    
    private func loadScoring() {
        Task {
            let ids = schools.map { $0.id }
            do {
                let response = try await APIService.shared.compareScoring(ids: ids)
                scoringData = response.scoring
            } catch {
                // 处理错误
            }
        }
    }
}
```

### 3.5 ViewModel 实现

```swift
import SwiftUI
import Combine

class SchoolViewModel: ObservableObject {
    @Published var schools: [School] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func search(query: String) {
        guard !query.isEmpty else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await APIService.shared.searchSchools(query: query)
                await MainActor.run {
                    self.schools = response.schools
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}

class CompareViewModel: ObservableObject {
    @Published var selectedSchools: Set<String> = []
    
    var hasSelection: Bool {
        !selectedSchools.isEmpty
    }
    
    func isSelected(_ school: School) -> Bool {
        selectedSchools.contains(school.id)
    }
    
    func toggleSelection(_ school: School) {
        if selectedSchools.contains(school.id) {
            selectedSchools.remove(school.id)
        } else {
            if selectedSchools.count < 3 {
                selectedSchools.insert(school.id)
            }
        }
    }
}
```

## 四、关键功能实现要点

### 4.1 学校搜索
- 使用 `TextField` 实现搜索输入
- 调用 `APIService.searchSchools()` 获取结果
- 处理 `possibleSchoolNames` 情况（显示选择界面）

### 4.2 学校详情
- 使用 `Sheet` 或 `NavigationLink` 显示详情
- 按分类展示信息（基本信息、学段、课程等）
- 支持网址链接跳转

### 4.3 多学校对比
- **基础对比**：使用 `Table` 或自定义表格视图
- **AI 评分对比**：
  - 显示量化对比表
  - 显示总分和各项得分
  - 显示评分说明和总结
  - 使用图表可视化（可选）

### 4.4 状态管理
- 使用 `@StateObject` 和 `@ObservedObject` 管理状态
- 使用 `Combine` 处理异步操作
- 缓存对比数据以提高性能

## 五、UI/UX 设计建议

### 5.1 设计风格
- 参考 Web 版本的配色方案（主色：#F75C62）
- 使用 iOS 原生设计语言（SF Symbols、系统字体）
- 保持响应式布局

### 5.2 交互优化
- 使用 `PullToRefresh` 实现下拉刷新
- 使用 `LazyVStack` 或 `LazyVGrid` 优化列表性能
- 添加加载状态和错误提示
- 支持深色模式

### 5.3 动画效果
- 使用 SwiftUI 的 `animation` 修饰符
- 卡片点击动画
- 页面转场动画

## 六、数据持久化（可选）

### 6.1 本地缓存
- 使用 `UserDefaults` 存储搜索历史
- 使用 `Core Data` 或 `SwiftData` 缓存学校数据
- 实现离线查看功能

### 6.2 收藏功能
- 允许用户收藏学校
- 本地存储收藏列表

## 七、测试要点

### 7.1 功能测试
- 搜索功能
- 学校详情展示
- 对比功能（基础/AI）
- 错误处理

### 7.2 性能测试
- 大量数据加载
- 网络请求优化
- 内存管理

### 7.3 UI 测试
- 不同屏幕尺寸适配
- 深色模式测试
- 无障碍功能

## 八、部署注意事项

### 8.1 API 配置
- 确保后端 API 支持 CORS（如果跨域）
- 配置正确的 API 基础 URL
- 处理 API 错误和超时

### 8.2 网络权限
- 在 `Info.plist` 中配置网络权限
- 处理网络不可用情况

### 8.3 版本管理
- 使用 Git 进行版本控制
- 遵循语义化版本号

## 九、参考资源

### 9.1 相关文件位置
- **前端 HTML**：`schoolinsight.html`
- **前端 JavaScript**：`js/schoolinsight.js`
- **后端 API**：`server.js`（第 254-838 行）
- **评估体系**：`evaluation-system.js`
- **API 文档**：`API访问指南.md`

### 9.2 学习资源
- SwiftUI 官方文档
- Combine 框架文档
- URLSession 网络编程
- Core Data / SwiftData 数据持久化

## 十、迁移检查清单

- [ ] 创建 Xcode 项目
- [ ] 实现数据模型（School、ScoringData 等）
- [ ] 实现 API 服务层
- [ ] 实现搜索视图
- [ ] 实现学校列表视图
- [ ] 实现学校详情视图
- [ ] 实现基础对比视图
- [ ] 实现 AI 评分对比视图
- [ ] 实现状态管理（ViewModel）
- [ ] 添加错误处理
- [ ] 添加加载状态
- [ ] UI/UX 优化
- [ ] 测试所有功能
- [ ] 性能优化
- [ ] 准备发布

## 十一、常见问题

### Q1: 如何处理中文字段名？
A: 使用 `CodingKeys` 枚举映射中文字段名到 Swift 属性名。

### Q2: AI 评估数据格式复杂，如何解析？
A: 创建对应的 `Codable` 结构体，逐层解析 JSON 数据。

### Q3: 如何优化大量学校数据的展示？
A: 使用 `LazyVStack`/`LazyVGrid`，实现分页加载，添加本地缓存。

### Q4: 对比表格在 iOS 上如何实现？
A: 使用 SwiftUI 的 `Table`（iOS 16+）或自定义 `VStack`/`HStack` 布局。

---

**注意**：本文档仅提供迁移指导，不修改现有代码。所有代码示例仅供参考，需要根据实际项目需求进行调整。

