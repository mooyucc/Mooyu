// 评估体系配置（基于最新评估维度，包含三级维度）
module.exports = {
    dimensions: [
        {
            name: '科研',
            weight: 45,
            indicators: [
                {
                    name: '课程声誉与体系成熟度',
                    weight: 25,
                    description: '评估学校课程体系的权威性、稳定性及家长/学界口碑。',
                    thirdLevelDimensions: [
                        {
                            name: '课程体系权威性',
                            weight: 10,
                            scoringCriteria: {
                                5: '获得官方IB/AP/A-Level认证且历史较长（>10年）',
                                4: '获得主流认证但时间较短',
                                3: '部分课程认证',
                                2: '无认证但自建体系完整',
                                1: '无认证且课程不稳定'
                            }
                        },
                        {
                            name: '课程实施连贯性',
                            weight: 10,
                            scoringCriteria: {
                                5: '小初高课程无缝衔接，有系统评估体系',
                                4: '衔接良好但有断点',
                                3: '有框架但实施不一致',
                                2: '各学段课程独立',
                                1: '缺乏规划'
                            }
                        },
                        {
                            name: '校本课程丰富度',
                            weight: 5,
                            scoringCriteria: {
                                5: '特色课程>10门且质量高，学生参与度>80%',
                                4: '5-10门特色课程',
                                3: '3-5门课程',
                                2: '1-2门课程',
                                1: '无特色课程'
                            }
                        }
                    ]
                },
                {
                    name: '教学成果与影响力',
                    weight: 20,
                    description: '评估学生在学术竞赛、科研成果(如青少年科创大赛)等方面的表现,以及教师的教学研究输出。',
                    thirdLevelDimensions: [
                        {
                            name: '学术竞赛表现',
                            weight: 10,
                            scoringCriteria: {
                                5: '国家级/国际级竞赛获奖率>15%',
                                4: '省级获奖率>20%',
                                3: '主要市级奖项',
                                2: '区级奖项',
                                1: '无系统参与'
                            }
                        },
                        {
                            name: '学生研究产出',
                            weight: 5,
                            scoringCriteria: {
                                5: '学生每年发表论文/专利≥3项',
                                4: '每年1-2项',
                                3: '校级成果展示',
                                2: '零星成果',
                                1: '无'
                            }
                        },
                        {
                            name: '教师教研影响力',
                            weight: 5,
                            scoringCriteria: {
                                5: '教师每年发表研究论文≥5篇/主持区级以上项目',
                                4: '每年2-4篇',
                                3: '校内教研活动',
                                2: '零星参与',
                                1: '无'
                            }
                        }
                    ]
                }
            ]
        },
        {
            name: '升学',
            weight: 20,
            indicators: [
                {
                    name: '大学认可度',
                    weight: 15,
                    description: '评估毕业生去向大学的层次和多样性,以及海外大学对其课程的熟悉度。',
                    thirdLevelDimensions: [
                        {
                            name: '大学关系网络',
                            weight: 5,
                            scoringCriteria: {
                                5: '与全球Top50大学有稳定合作项目，招生官来访>10次/年',
                                4: '有合作项目，来访5-10次',
                                3: '有联系但不稳定',
                                2: '联系很少',
                                1: '无'
                            }
                        },
                        {
                            name: '往届生口碑',
                            weight: 5,
                            scoringCriteria: {
                                5: '毕业生在大学表现优秀，主动推荐率高',
                                4: '反馈积极',
                                3: '反馈中性',
                                2: '偶有负面反馈',
                                1: '无跟进'
                            }
                        },
                        {
                            name: '课程匹配度',
                            weight: 5,
                            scoringCriteria: {
                                5: '课程完全匹配主流大学录取要求（如AP学分全认可）',
                                4: '高度匹配',
                                3: '基本匹配',
                                2: '部分匹配',
                                1: '不匹配'
                            }
                        }
                    ]
                },
                {
                    name: '升学成果',
                    weight: 5,
                    description: '重点考察顶尖大学录取率及整体升学成功率。',
                    thirdLevelDimensions: [
                        {
                            name: '顶尖录取率',
                            weight: 2,
                            scoringCriteria: {
                                5: '全球Top30/国内985录取率>30%',
                                4: '>20%',
                                3: '>10%',
                                2: '>5%',
                                1: '<5%'
                            }
                        },
                        {
                            name: '整体升学率',
                            weight: 2,
                            scoringCriteria: {
                                5: '100%升学（含目标国家）',
                                4: '>95%',
                                3: '>90%',
                                2: '>85%',
                                1: '<85%'
                            }
                        },
                        {
                            name: '专业多样性',
                            weight: 1,
                            scoringCriteria: {
                                5: '录取专业覆盖>6个领域',
                                4: '4-5个领域',
                                3: '3个领域',
                                2: '2个领域',
                                1: '集中在1个领域'
                            }
                        }
                    ]
                }
            ]
        },
        {
            name: '教学',
            weight: 15,
            indicators: [
                {
                    name: '师生比',
                    weight: 10,
                    description: '作为教学质量的替代指标,较低的比例意味着学生可能获得更多的教师关注。',
                    thirdLevelDimensions: [
                        {
                            name: '行政班平均人数',
                            weight: 6,
                            scoringCriteria: {
                                5: '≤20人',
                                4: '21-25人',
                                3: '26-30人',
                                2: '31-35人',
                                1: '>35人'
                            }
                        },
                        {
                            name: '个性化辅导机制',
                            weight: 4,
                            scoringCriteria: {
                                5: '成熟的导师制+定期1对1规划',
                                4: '有导师制',
                                3: '有Office Hour',
                                2: '仅课后答疑',
                                1: '无'
                            }
                        }
                    ]
                },
                {
                    name: '教师教育背景与稳定性',
                    weight: 5,
                    description: '评估教师队伍的学历水平和稳定性。',
                    thirdLevelDimensions: [
                        {
                            name: '顶尖学历比例',
                            weight: 2,
                            scoringCriteria: {
                                5: '硕士/博士比例>80%，顶尖大学背景>30%',
                                4: '硕士/博士>70%',
                                3: '硕士/博士>60%',
                                2: '硕士/博士>50%',
                                1: '<50%'
                            }
                        },
                        {
                            name: '专业匹配度',
                            weight: 2,
                            scoringCriteria: {
                                5: '教师专业与所教科目高度相关>90%',
                                4: '>80%',
                                3: '>70%',
                                2: '>60%',
                                1: '<60%'
                            }
                        },
                        {
                            name: '平均服务年限',
                            weight: 1,
                            scoringCriteria: {
                                5: '>5年',
                                4: '4-5年',
                                3: '3-4年',
                                2: '2-3年',
                                1: '<2年'
                            }
                        }
                    ]
                }
            ]
        },
        {
            name: '国际化',
            weight: 15,
            indicators: [
                {
                    name: '国际教员比例',
                    weight: 5,
                    description: '学校吸引外籍教师的能力。',
                    thirdLevelDimensions: [
                        {
                            name: '外教资质与合规性',
                            weight: 3,
                            scoringCriteria: {
                                5: '100%持有国家教师资格证+工作签证',
                                4: '>90%',
                                3: '>80%',
                                2: '>70%',
                                1: '<70%'
                            }
                        },
                        {
                            name: '外教课程参与度',
                            weight: 2,
                            scoringCriteria: {
                                5: '外教主导核心科目并参与教研',
                                4: '主导语言+部分科目',
                                3: '仅语言课',
                                2: '辅助教学',
                                1: '象征性参与'
                            }
                        }
                    ]
                },
                {
                    name: '国际学生比例',
                    weight: 5,
                    description: '学校吸引国际学生的能力。',
                    thirdLevelDimensions: [
                        {
                            name: '文化多样性',
                            weight: 3,
                            scoringCriteria: {
                                5: '国际生来自>15个国家，无单一国籍占主导',
                                4: '>10个国家',
                                3: '>5个国家',
                                2: '2-5个国家',
                                1: '仅1-2个国家'
                            }
                        },
                        {
                            name: '跨文化融合活动',
                            weight: 2,
                            scoringCriteria: {
                                5: '系统化的中外学生合作项目+文化节',
                                4: '定期活动',
                                3: '偶尔活动',
                                2: '活动很少',
                                1: '无'
                            }
                        }
                    ]
                },
                {
                    name: '国际研究网络',
                    weight: 5,
                    description: '衡量大学与不同国家/地区的研究机构进行合作的广度和深度。',
                    thirdLevelDimensions: [
                        {
                            name: '实质性国际合作',
                            weight: 3,
                            scoringCriteria: {
                                5: '固定交换项目，与知名海外学校联合研究项目',
                                4: '有交换项目',
                                3: '短期游学',
                                2: '仅线上交流',
                                1: '无'
                            }
                        },
                        {
                            name: '国际资源引入',
                            weight: 2,
                            scoringCriteria: {
                                5: '定期引入海外大学课程/专家并融入教学',
                                4: '偶尔引入',
                                3: '有访问讲座',
                                2: '零星资源',
                                1: '无'
                            }
                        }
                    ]
                }
            ]
        },
        {
            name: '社会影响',
            weight: 5,
            indicators: [
                {
                    name: '品牌与社区影响力',
                    weight: 5,
                    description: '评估学校的办学稳定性、品牌美誉度及在校内外发起的公益、环保等项目影响力。',
                    thirdLevelDimensions: [
                        {
                            name: '家长口碑与满意度',
                            weight: 2,
                            scoringCriteria: {
                                5: '满意度>95%，推荐率>80%',
                                4: '满意度>90%',
                                3: '>85%',
                                2: '>80%',
                                1: '<80%'
                            }
                        },
                        {
                            name: '社会责任实践',
                            weight: 2,
                            scoringCriteria: {
                                5: '≥3个长期学生主导的公益项目，有社会影响力',
                                4: '有长期项目',
                                3: '有短期项目',
                                2: '偶尔参与',
                                1: '无'
                            }
                        },
                        {
                            name: '行业标杆地位',
                            weight: 1,
                            scoringCriteria: {
                                5: '常被教育部门或同行作为示范校参观',
                                4: '被权威媒体/机构报道',
                                3: '区域内知名',
                                2: '本地知名',
                                1: '不知名'
                            }
                        }
                    ]
                }
            ]
        }
    ]
};
